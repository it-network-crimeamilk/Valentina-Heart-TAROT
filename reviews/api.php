<?php

declare(strict_types=1);

// --- Настройки ---
const REVIEWS_FILE = __DIR__ . '/reviews.json';
const AVATARS_DIR  = __DIR__ . '/avatars';
const AVATARS_URL  = 'reviews/avatars';
const ADMIN_HASH = 'SGVzb3lhbTE2MDcr';

// Разрешённые расширения и MIME для аватарок
const ALLOWED_EXT  = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 МБ

// --- Заголовки ---
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

// --- Хелперы ---

function respond(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $msg, int $code = 400): void {
    respond(['success' => false, 'error' => $msg], $code);
}

function isAdmin(): bool {
    $hdr = $_SERVER['HTTP_X_ADMIN_PASS'] ?? '';
    if ($hdr !== '' && hash_equals(ADMIN_HASH, $hdr)) return true;

    if (isset($_POST['_admin_pass']) && is_string($_POST['_admin_pass'])) {
        if (hash_equals(ADMIN_HASH, $_POST['_admin_pass'])) return true;
    }
    return false;
}

function requireAdmin(): void {
    if (!isAdmin()) fail('Неавторизованный доступ', 401);
}

function loadReviews(): array {
    if (!is_file(REVIEWS_FILE)) {
        return ['reviews' => []];
    }
    $raw = file_get_contents(REVIEWS_FILE);
    if ($raw === false || $raw === '') return ['reviews' => []];
    $data = json_decode($raw, true);
    if (!is_array($data)) return ['reviews' => []];
    if (!isset($data['reviews']) || !is_array($data['reviews'])) {
        $data['reviews'] = [];
    }
    return $data;
}

function saveReviews(array $data): void {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) fail('Не удалось сериализовать JSON', 500);

    $tmp = REVIEWS_FILE . '.tmp.' . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $json, LOCK_EX) === false) {
        fail('Не удалось записать временный файл', 500);
    }
    if (!rename($tmp, REVIEWS_FILE)) {
        @unlink($tmp);
        fail('Не удалось заменить файл отзывов', 500);
    }
    @chmod(REVIEWS_FILE, 0644);
}

function nextId(array $reviews): int {
    $max = 0;
    foreach ($reviews as $r) {
        $id = (int)($r['id'] ?? 0);
        if ($id > $max) $max = $id;
    }
    return $max + 1;
}

/**
 * Безопасная очистка текста.
 * Убираем управляющие символы без флага /u (чтобы не падать на невалидном UTF-8),
 * затем корректно обрезаем по mb_substr с явной кодировкой.
 */
function sanitizeText(string $s, int $max = 1000): string {
    $s = trim($s);
    // Удаляем управляющие символы (без /u — безопасно для любой бинарной строки)
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $s);
    // Нормализуем кодировку, если пришёл невалидный UTF-8
    if (!mb_check_encoding($s, 'UTF-8')) {
        $s = mb_convert_encoding($s, 'UTF-8', 'UTF-8');
    }
    if (mb_strlen($s, 'UTF-8') > $max) {
        $s = mb_substr($s, 0, $max, 'UTF-8');
    }
    return $s;
}

/**
 * Обработка загрузки аватарки.
 * Возвращает относительный URL сохранённого файла или null, если файл не передан.
 */
function handleAvatarUpload(): ?string {
    // Вариант 1: обычная загрузка файла (multipart)
    if (!empty($_FILES['avatar']) && is_array($_FILES['avatar'])) {
        $f = $_FILES['avatar'];
        $err = $f['error'] ?? UPLOAD_ERR_NO_FILE;
        if ($err === UPLOAD_ERR_NO_FILE) return null;
        if ($err !== UPLOAD_ERR_OK) {
            fail('Ошибка загрузки файла (код ' . $err . ')', 400);
        }
        if (($f['size'] ?? 0) > MAX_AVATAR_BYTES) {
            fail('Файл аватарки больше 2 МБ', 413);
        }

        $mime = null;
        if (function_exists('finfo_open')) {
            $fi = finfo_open(FILEINFO_MIME_TYPE);
            if ($fi) {
                $mime = finfo_file($fi, $f['tmp_name']);
                finfo_close($fi);
            }
        }
        if (!$mime) {
            $mime = mime_content_type($f['tmp_name']) ?: '';
        }
        if (!in_array($mime, ALLOWED_MIME, true)) {
            fail('Недопустимый тип файла (только изображения)', 415);
        }

        $ext = strtolower(pathinfo($f['name'] ?? '', PATHINFO_EXTENSION));
        if (!in_array($ext, ALLOWED_EXT, true)) {
            if ($mime === 'image/png') $ext = 'png';
            elseif ($mime === 'image/webp') $ext = 'webp';
            elseif ($mime === 'image/gif') $ext = 'gif';
            else $ext = 'jpg';
        }
        return storeAvatarFromUpload($f['tmp_name'], $ext);
    }

    // Вариант 2: data URL (base64) — например, из canvas
    if (!empty($_POST['avatar_data']) && is_string($_POST['avatar_data'])) {
        $data = $_POST['avatar_data'];
        if (!preg_match('#^data:image/([a-zA-Z0-9.+-]+);base64,(.+)$#', $data, $m)) {
            fail('Некорректный формат аватарки', 400);
        }
        $subtype = strtolower($m[1]);
        $bin = base64_decode($m[2], true);
        if ($bin === false) fail('Некорректный base64', 400);
        if (strlen($bin) > MAX_AVATAR_BYTES) fail('Файл аватарки больше 2 МБ', 413);

        $ext = $subtype === 'jpeg' ? 'jpg' : preg_replace('/[^a-z0-9]/', '', $subtype);
        if (!in_array($ext, ALLOWED_EXT, true)) $ext = 'jpg';

        return storeAvatarFromBinary($bin, $ext);
    }

    return null;
}

/**
 * Сохранение файла, полученного через обычную загрузку (move_uploaded_file).
 */
function storeAvatarFromUpload(string $tmpPath, string $ext): string {
    ensureAvatarsDir();
    $dest = buildAvatarPath($ext);
    if (!move_uploaded_file($tmpPath, $dest)) {
        // Fallback: если move_uploaded_file не сработал (например, файл не загружен через HTTP),
        // пробуем обычное копирование/переименование.
        if (!@rename($tmpPath, $dest) && !@copy($tmpPath, $dest)) {
            fail('Не удалось сохранить аватарку', 500);
        }
    }
    @chmod($dest, 0644);
    return AVATARS_URL . '/' . basename($dest);
}

/**
 * Сохранение бинарных данных (из base64) — без move_uploaded_file.
 */
function storeAvatarFromBinary(string $bin, string $ext): string {
    ensureAvatarsDir();
    $dest = buildAvatarPath($ext);
    if (file_put_contents($dest, $bin) === false) {
        fail('Не удалось сохранить аватарку', 500);
    }
    @chmod($dest, 0644);
    return AVATARS_URL . '/' . basename($dest);
}

function ensureAvatarsDir(): void {
    if (!is_dir(AVATARS_DIR)) {
        if (!mkdir(AVATARS_DIR, 0755, true) && !is_dir(AVATARS_DIR)) {
            fail('Не удалось создать папку аватарок', 500);
        }
    }
}

function buildAvatarPath(string $ext): string {
    $name = 'avatar_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    return AVATARS_DIR . '/' . $name;
}

// =====================================================
// Роутинг
// =====================================================

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $data = loadReviews();
    respond(['success' => true, 'reviews' => $data['reviews']]);
}

if ($method !== 'POST') {
    fail('Метод не поддерживается', 405);
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    case 'create': {
        $admin = isAdmin();

        $name = sanitizeText((string)($_POST['name'] ?? ''), 60);
        $text = sanitizeText((string)($_POST['text'] ?? ''), 1000);
        $date = sanitizeText((string)($_POST['date'] ?? ''), 10);

        if ($admin) {
            $visible = !isset($_POST['visible'])
                || $_POST['visible'] === 'true'
                || $_POST['visible'] === '1';
        } else {
            $visible = false; // публичный отзыв всегда уходит на модерацию
        }

        if ($name === '') fail('Имя обязательно', 422);
        if ($text === '') fail('Текст обязателен', 422);
        if ($date === '') $date = date('Y-m-d');

        $avatar = handleAvatarUpload();
        if ($avatar === null) $avatar = 'reviews/avatars/avatar_comments.jpg';

        $data = loadReviews();
        $new = [
            'id'      => nextId($data['reviews']),
            'name'    => $name,
            'avatar'  => $avatar,
            'text'    => $text,
            'visible' => $visible,
            'date'    => $date,
        ];
        $data['reviews'][] = $new;
        saveReviews($data);

        respond(['success' => true, 'review' => $new]);
    }

    case 'update': {
        requireAdmin();

        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) fail('Некорректный id', 422);

        $data = loadReviews();
        $found = false;
        foreach ($data['reviews'] as &$r) {
            if ((int)($r['id'] ?? 0) !== $id) continue;
            $found = true;

            if (isset($_POST['name']))    $r['name']    = sanitizeText((string)$_POST['name'], 60);
            if (isset($_POST['text']))    $r['text']    = sanitizeText((string)$_POST['text'], 1000);
            if (isset($_POST['date']))    $r['date']    = sanitizeText((string)$_POST['date'], 10);
            if (isset($_POST['visible'])) {
                $r['visible'] = ($_POST['visible'] === 'true' || $_POST['visible'] === '1');
            }

            $newAvatar = handleAvatarUpload();
            if ($newAvatar !== null) $r['avatar'] = $newAvatar;
            break;
        }
        unset($r);

        if (!$found) fail('Отзыв не найден', 404);
        saveReviews($data);
        respond(['success' => true]);
    }

    case 'delete': {
        requireAdmin();

        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) fail('Некорректный id', 422);

        $data = loadReviews();
        $before = count($data['reviews']);
        $data['reviews'] = array_values(array_filter(
            $data['reviews'],
            fn($r) => (int)($r['id'] ?? 0) !== $id
        ));

        if (count($data['reviews']) === $before) fail('Отзыв не найден', 404);

        saveReviews($data);
        respond(['success' => true]);
    }

    default:
        fail('Неизвестное действие', 400);
}
