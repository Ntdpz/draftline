<?php
require_once __DIR__.'/components.php';
function page_controls(): void { ?>
<div class="page-controls" role="group" aria-label="Page navigation">
    <button type="button" data-nav="back" aria-label="Back" title="Back"><?= icon('back') ?></button>
    <button type="button" data-nav="forward" aria-label="Forward" title="Forward"><?= icon('forward') ?></button>
    <button type="button" data-nav="refresh" aria-label="Refresh page" title="Refresh page"><?= icon('refresh') ?></button>
</div>
<?php }
function app_header(string $active = ''): void { ?>
<header class="app-header"><div class="app-header-inner">
    <div class="brand-control-group"><?php brand(); ?><span class="header-rule" aria-hidden="true"></span><?php page_controls(); ?></div>
    <nav class="app-navigation" aria-label="Main navigation">
        <a href="workspace.php" <?= $active === 'workspace' ? 'aria-current="page"' : '' ?>>My Workspace</a>
        <a href="templates.php" <?= $active === 'templates' ? 'aria-current="page"' : '' ?>>Templates</a>
        <a href="collections.php" <?= $active === 'collections' ? 'aria-current="page"' : '' ?>>Collections</a>
        <details class="more-navigation"><summary <?= $active === 'more' ? 'class="is-active"' : '' ?>>More <span aria-hidden="true">⌄</span></summary><div class="popover">
            <a href="trash.php">Trash</a><a href="settings.php">Settings &amp; appearance</a><a href="./">A little inspiration</a><a href="canvas.php">Open canvas</a>
        </div></details>
    </nav>
    <details class="app-mobile-navigation"><summary aria-label="Open navigation"><?= icon('menu') ?></summary><nav class="popover" aria-label="Mobile navigation">
        <a href="workspace.php">My Workspace</a><a href="templates.php">Templates</a><a href="collections.php">Collections</a><a href="trash.php">Trash</a><a href="settings.php">Settings &amp; appearance</a><a href="./">A little inspiration</a><a href="canvas.php">Open canvas</a>
    </nav></details>
</div></header>
<?php }
function app_page(string $page, string $title, string $active): void {
    head($title.' — Draftline'); ?>
<body class="app-page app-<?= e($page) ?>" data-page="<?= e($page) ?>">
<a class="skip-link" href="#page-content">Skip to content</a>
<?php app_header($active); ?>
<main class="app-main" id="main"><div id="storage-status" role="status"></div><div id="page-content" class="page-content" aria-busy="true"><p class="loading-note">Making a little room…</p></div></main>
<footer class="app-footer"><span><i class="privacy-dot"></i> Saved in this browser, on this device.</span><a href="settings.php#privacy">About your saved drafts ↗</a></footer>
<dialog id="action-dialog" class="small-dialog" aria-labelledby="action-title"><div class="dialog-heading"><span class="eyebrow" id="action-eyebrow">MAKE IT YOURS</span><button type="button" class="icon-button" data-dismiss-dialog aria-label="Close dialog"><?= icon('close') ?></button></div><h2 id="action-title"></h2><form id="action-form"><div id="action-fields"></div><p id="action-error" class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button button-light" data-dismiss-dialog>Cancel</button><button type="submit" class="button" id="action-submit">Save</button></div></form></dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<noscript><p class="noscript-note">Your drafts stay in this browser. Enable JavaScript to manage them, or <a href="./">explore Draftline</a>.</p></noscript>
</body></html>
<?php }
