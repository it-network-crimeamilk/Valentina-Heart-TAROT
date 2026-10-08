<?php

declare(strict_types=1);

// --- Настройки ---
const ORDERS_FILE      = __DIR__ . '/orders.json';
const UPLOADS_DIR      = __DIR__ . '/uploads';
const UPLOADS_URL      = 'orders/uploads';
const ADMIN_HASH       = 'SGVzb3lhbTE2MDcr';

// Разрешённые расширения и MIME для вложений
const ALLOWED_EXT      = ['jpg', 'jpeg', 'png', 'pdf'];
const ALLOWED_MIME     = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_BYTES   = 10 * 1024 * 1024; // 10 МБ

// Автоочистка вложений
const AUTO_CLEANUP_DAYS     = 30;
const AUTO_CLEANUP_INTERVAL = 86400; // 24 часа

// Статусы заявок
const VALID_STATUSES = ['new', 'in_progress', 'done', 'rejected'];

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

function loadOrders(): array {
    if (!is_file(ORDERS_FILE)) {
        return ['_last_cleanup' => 0, 'orders' => []];
    }
    $raw = file_get_contents(ORDERS_FILE);
    if ($raw === false || $raw === '') return ['_last_cleanup' => 0, 'orders' => []];
    $data = json_decode($raw, true);
    if (!is_array($data)) return ['_last_cleanup' => 0, 'orders' => []];
    if (!isset($data['orders']) || !is_array($data['orders'])) {
        $data['orders'] = [];
    }
    if (!isset($data['_last_cleanup'])) {
        $data['_last_cleanup'] = 0;
    }
    return $data;
}

function saveOrders(array $data): void {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) fail('Не удалось сериализовать JSON', 500);

    $tmp = ORDERS_FILE . '.tmp.' . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $json, LOCK_EX) === false) {
        fail('Не удалось записать временный файл', 500);
    }
    if (!rename($tmp, ORDERS_FILE)) {
        @unlink($tmp);
        fail('Не удалось заменить файл заявок', 500);
    }
    @chmod(ORDERS_FILE, 0644);
}

function nextId(array $orders): int {
    $max = 0;
    foreach ($orders as $o) {
        $id = (int)($o['id'] ?? 0);
        if ($id > $max) $max = $id;
    }
    return $max + 1;
}

function sanitizeText(string $s, int $max = 2000): string {
    $s = trim($s);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $s);
    if (!mb_check_encoding($s, 'UTF-8')) {
        $s = mb_convert_encoding($s, 'UTF-8', 'UTF-8');
    }
    if (mb_strlen($s, 'UTF-8') > $max) {
        $s = mb_substr($s, 0, $max, 'UTF-8');
    }
    return $s;
}

function ensureUploadsDir(): void {
    if (!is_dir(UPLOADS_DIR)) {
        if (!mkdir(UPLOADS_DIR, 0755, true) && !is_dir(UPLOADS_DIR)) {
            fail('Не удалось создать папку вложений', 500);
        }
    }
}

function buildFilePath(string $ext): string {
    $name = 'order_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    return UPLOADS_DIR . '/' . $name;
}

/**
 * Обработка загрузки вложения (скриншот оплаты + фото).
 * Возвращает массив ['path' => ..., 'name' => ...] или null.
 */
function handleAttachmentUpload(): ?array {
    if (empty($_FILES['attachment']) || !is_array($_FILES['attachment'])) {
        return null;
    }
    $f = $_FILES['attachment'];
    $err = $f['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($err === UPLOAD_ERR_NO_FILE) return null;
    if ($err !== UPLOAD_ERR_OK) {
        fail('Ошибка загрузки файла (код ' . $err . ')', 400);
    }
    if (($f['size'] ?? 0) > MAX_FILE_BYTES) {
        fail('Файл больше 10 МБ', 413);
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
        fail('Недопустимый тип файла (JPG, PNG, PDF)', 415);
    }

    $ext = strtolower(pathinfo($f['name'] ?? '', PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXT, true)) {
        if ($mime === 'image/png') $ext = 'png';
        elseif ($mime === 'application/pdf') $ext = 'pdf';
        else $ext = 'jpg';
    }

    $originalName = sanitizeText((string)($f['name'] ?? 'file.' . $ext), 255);

    ensureUploadsDir();
    $dest = buildFilePath($ext);
    if (!move_uploaded_file($f['tmp_name'], $dest)) {
        if (!@rename($f['tmp_name'], $dest) && !@copy($f['tmp_name'], $dest)) {
            fail('Не удалось сохранить файл', 500);
        }
    }
    @chmod($dest, 0644);

    return [
        'path' => UPLOADS_URL . '/' . basename($dest),
        'name' => $originalName
    ];
}

/**
 * Безопасное удаление файла из папки uploads.
 * Возвращает true, если файл удалён или уже отсутствует.
 */
function deleteUploadFile(string $relativePath): bool {
    if ($relativePath === '') return false;

    $basename = basename($relativePath);
    if ($basename === '' || $basename[0] === '.') return false;

    $ext = strtolower(pathinfo($basename, PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXT, true)) return false;
    if (strpos($basename, 'order_') !== 0) return false;

    $full = UPLOADS_DIR . '/' . $basename;
    $real = realpath($full);
    $dirReal = realpath(UPLOADS_DIR);

    if ($real === false) {
        return true;
    }
    if ($dirReal === false || strpos($real, $dirReal) !== 0) {
        return false;
    }
    return @unlink($real);
}

/**
 * Автоочистка вложений старше AUTO_CLEANUP_DAYS.
 * Модифицирует $data по ссылке, возвращает количество удалённых файлов.
 */
function autoCleanupOldAttachments(array &$data): int {
    $last = (int)($data['_last_cleanup'] ?? 0);
    if (time() - $last < AUTO_CLEANUP_INTERVAL) return 0;

    $threshold = time() - AUTO_CLEANUP_DAYS * 86400;
    $deleted = 0;

    foreach ($data['orders'] as &$o) {
        if (empty($o['attachment'])) continue;
        if (!empty($o['attachment_deleted'])) continue;

        $ts = strtotime((string)($o['date'] ?? ''));
        if ($ts === false || $ts >= $threshold) continue;

        deleteUploadFile((string)$o['attachment']);
        $o['attachment_deleted'] = true;
        $o['attachment_deleted_at'] = date('Y-m-d H:i:s');
        $deleted++;
    }
    unset($o);

    $data['_last_cleanup'] = time();
    return $deleted;
}

function cleanupAllUploads(array &$data): int {
    $deleted = 0;
    if (is_dir(UPLOADS_DIR)) {
        $items = scandir(UPLOADS_DIR);
        if ($items !== false) {
            foreach ($items as $it) {
                if ($it === '.' || $it === '..') continue;
                if ($it[0] === '.') continue;
                if ($it === 'index.html') continue;

                $ext = strtolower(pathinfo($it, PATHINFO_EXTENSION));
                if (!in_array($ext, ALLOWED_EXT, true)) continue;
                if (strpos($it, 'order_') !== 0) continue;

                $full = UPLOADS_DIR . '/' . $it;
                $real = realpath($full);
                $dirReal = realpath(UPLOADS_DIR);
                if ($real !== false && $dirReal !== false && strpos($real, $dirReal) === 0) {
                    if (@unlink($real)) $deleted++;
                }
            }
        }
    }

    foreach ($data['orders'] as &$o) {
        if (empty($o['attachment'])) continue;
        if (!empty($o['attachment_deleted'])) continue;
        $o['attachment_deleted'] = true;
        $o['attachment_deleted_at'] = date('Y-m-d H:i:s');
    }
    unset($o);

    return $deleted;
}

// =====================================================
// Роутинг
// =====================================================

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    requireAdmin();
    $data = loadOrders();
    $deleted = autoCleanupOldAttachments($data);
    if ($deleted > 0) saveOrders($data);

    unset($data['_last_cleanup']);
    respond(['success' => true, 'orders' => array_values($data['orders'])]);
}

if ($method !== 'POST') {
    fail('Метод не поддерживается', 405);
}

$action = $_POST['action'] ?? '';

switch ($action) {

    case 'create': {
        $name    = sanitizeText((string)($_POST['name'] ?? ''), 120);
        $contact = sanitizeText((string)($_POST['contact'] ?? ''), 200);
        $message = sanitizeText((string)($_POST['message'] ?? ''), 2000);

        if ($name === '')    fail('Имя обязательно', 422);
        if ($contact === '') fail('Контакт обязателен', 422);
        if ($message === '') fail('Описание обязательно', 422);

        $upload = handleAttachmentUpload();
        if ($upload === null) fail('Прикрепите файл (скриншот оплаты и фото)', 422);

        $data = loadOrders();
        $new = [
            'id'                    => nextId($data['orders']),
            'name'                  => $name,
            'contact'               => $contact,
            'message'               => $message,
            'attachment'            => $upload['path'],
            'attachment_name'       => $upload['name'],
            'attachment_deleted'    => false,
            'attachment_deleted_at' => '',
            'status'                => 'new',
            'note'                  => '',
            'date'                  => date('Y-m-d H:i:s'),
        ];
        $data['orders'][] = $new;
        saveOrders($data);

        respond(['success' => true, 'order' => $new]);
    }

    case 'update': {
        requireAdmin();

        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) fail('Некорректный id', 422);

        $data = loadOrders();
        autoCleanupOldAttachments($data);

        $found = false;
        foreach ($data['orders'] as &$o) {
            if ((int)($o['id'] ?? 0) !== $id) continue;
            $found = true;

            if (isset($_POST['name']))    $o['name']    = sanitizeText((string)$_POST['name'], 120);
            if (isset($_POST['contact'])) $o['contact'] = sanitizeText((string)$_POST['contact'], 200);
            if (isset($_POST['message'])) $o['message'] = sanitizeText((string)$_POST['message'], 2000);
            if (isset($_POST['note']))    $o['note']    = sanitizeText((string)$_POST['note'], 2000);
            if (isset($_POST['status'])) {
                $st = (string)$_POST['status'];
                if (in_array($st, VALID_STATUSES, true)) $o['status'] = $st;
            }
            break;
        }
        unset($o);

        if (!$found) fail('Заявка не найдена', 404);
        saveOrders($data);
        respond(['success' => true]);
    }

    case 'delete': {
        requireAdmin();

        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) fail('Некорректный id', 422);

        $data = loadOrders();
        autoCleanupOldAttachments($data);

        $before = count($data['orders']);
        $removed = null;
        $data['orders'] = array_values(array_filter(
            $data['orders'],
            function ($o) use ($id, &$removed) {
                if ((int)($o['id'] ?? 0) === $id) { $removed = $o; return false; }
                return true;
            }
        ));

        if (count($data['orders']) === $before) fail('Заявка не найдена', 404);

        if ($removed && !empty($removed['attachment']) && empty($removed['attachment_deleted'])) {
            deleteUploadFile((string)$removed['attachment']);
        }

        saveOrders($data);
        respond(['success' => true]);
    }

    case 'cleanup_uploads': {
        requireAdmin();

        $data = loadOrders();
        autoCleanupOldAttachments($data);
        $deleted = cleanupAllUploads($data);
        saveOrders($data);

        respond(['success' => true, 'deleted' => $deleted]);
    }

    default:
        fail('Неизвестное действие', 400);
}
