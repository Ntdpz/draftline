<?php
declare(strict_types=1);
function e(string $text): string { return htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); }
function icon(string $name, string $class = ''): string {
    $paths = [
        'pencil' => '<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5M3 21h6"/>',
        'arrow' => '<path d="M4 12h15m-6-6 6 6-6 6"/>',
        'pointer' => '<path d="m5 3 14 9-7 1-3 7Z"/>',
        'square' => '<rect x="4" y="4" width="16" height="16" rx="3"/>',
        'diamond' => '<path d="m12 3 9 9-9 9-9-9Z"/>',
        'undo' => '<path d="m8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12"/>',
        'download' => '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
        'play' => '<path d="m8 4 13 8-13 8Z"/>',
        'save' => '<path d="M5 3h13l3 3v15H3V3Z"/><path d="M7 3v6h10V3M7 21v-7h10v7"/>',
        'check' => '<path d="m5 12 4 4L20 5"/>',
        'close' => '<path d="m6 6 12 12M6 18 18 6"/>',
        'menu' => '<path d="M4 7h16M4 12h16M4 17h16"/>',
        'plus' => '<path d="M12 4v16M4 12h16"/>',
        'folder' => '<path d="M3 6h7l2 3h9v12H3Z"/>',
        'back' => '<path d="M20 12H4m6-6-6 6 6 6"/>',
        'forward' => '<path d="M4 12h16m-6-6 6 6-6 6"/>',
        'refresh' => '<path d="M20 7v5h-5M20 12a8 8 0 1 0-2 6M20 7V3"/>',
    ];
    return '<svg class="icon '.e($class).'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'.($paths[$name] ?? $paths['arrow']).'</svg>';
}
function brand(): void { ?><a class="brand" href="./" aria-label="Draftline home"><span class="brand-mark"><?= icon('pencil') ?></span><span>draftline</span></a><?php }
function head(string $title): void { ?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#fffefb"><meta name="description" content="Give your rough ideas a clearer path. Draftline is a playful, browser-local space for creating user flows."><title><?= e($title) ?></title><link rel="icon" href="assets/images/favicon.svg" type="image/svg+xml"><link rel="preload" href="assets/fonts/caveat-600.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="assets/css/styles.css"><link rel="stylesheet" href="assets/css/workspace.css"><script src="assets/js/core.js" defer></script><script src="assets/js/app.js" defer></script><script src="assets/js/pages.js" defer></script></head>
<?php }
function editor(bool $workspace = false): void { ?>
<section class="editor <?= $workspace ? 'editor-workspace' : '' ?>" id="demo" aria-label="Interactive flow canvas">
    <header class="editor-bar"><div class="editor-breadcrumb"><?= icon('folder') ?><span>Personal space</span><span class="breadcrumb-slash">/</span><button class="project-name" type="button" data-action="rename">First idea <span>⌄</span></button></div><div class="style-switch" role="group" aria-label="Diagram style"><button type="button" data-style="sketch" class="is-active" aria-pressed="true">Sketch</button><button type="button" data-style="clean" aria-pressed="false">Clean</button></div><button type="button" class="button button-small" data-action="save"><?= icon('save') ?><span>Save draft</span></button></header>
    <div class="canvas-paper dots"><div class="tool-rail" role="toolbar" aria-label="Canvas tools"><button type="button" class="is-active" data-action="select" aria-label="Select and edit a step" title="Select / edit"><?= icon('pointer') ?></button><button type="button" data-action="add" aria-label="Add a step" title="Add a step"><?= icon('square') ?></button><button type="button" data-action="decision" aria-label="Add a decision" title="Add a decision"><?= icon('diamond') ?></button><span class="rail-divider"></span><button type="button" data-action="undo" aria-label="Undo last edit" title="Undo last edit" disabled><?= icon('undo') ?></button><button type="button" data-action="present" aria-label="Present this flow" title="Present this flow"><?= icon('play') ?></button><button type="button" data-action="export" aria-label="Export SVG" title="Export SVG"><?= icon('download') ?></button></div>
        <div class="canvas-status"><span class="status-dot"></span><span data-node-count>5 steps · 5 connections</span></div>
        <svg id="flow-canvas" viewBox="0 0 1100 380" role="group" aria-label="Your editable user flow"><title>From an idea to a clear next step</title></svg>
        <p class="canvas-annotation">a little room to think <span>↙</span></p>
        <div class="canvas-footer"><span>Click a step to make it yours. Drag to rearrange.</span><button type="button" data-action="reset">Reset view <span>↺</span></button></div>
    </div>
    <div class="prompt-area"><form class="prompt-form" id="outline-form"><span class="prompt-icon"><?= icon('pencil') ?></span><label class="sr-only" for="outline">Your flow outline</label><input id="outline" name="outline" type="text" placeholder="An idea → A conversation → A clearer next step" maxlength="400" autocomplete="off"><button type="submit" class="button button-small"><span>Build flow</span><?= icon('arrow') ?></button></form><div class="example-chips"><span>Try a little:</span><button type="button" data-template="onboarding">First-time onboarding ↗</button><button type="button" data-template="checkout">A thoughtful checkout ↗</button><button type="button" data-template="support">Getting a little help ↗</button></div><p class="outline-hint" id="outline-hint" role="status">Use arrows (→ or ->) between 2–8 steps. Everything stays on this device.</p></div>
</section>
<?php }
function dialogs(): void { ?>
<dialog id="edit-dialog" class="small-dialog"><div class="dialog-heading"><span class="eyebrow">MAKE IT YOURS</span><button class="icon-button" type="button" data-close aria-label="Close step editor"><?= icon('close') ?></button></div><h2>A little more clarity.</h2><form id="edit-form"><label for="step-name">What happens at this step?</label><input id="step-name" type="text" maxlength="42" required autocomplete="off"><label for="step-shape">Shape</label><select id="step-shape"><option value="step">A step</option><option value="decision">A decision</option><option value="start">A starting point</option></select><div class="color-options" role="group" aria-label="Step color"><button type="button" class="swatch peach" data-color="peach" aria-label="Peach" aria-pressed="false"></button><button type="button" class="swatch lilac" data-color="lilac" aria-label="Lilac" aria-pressed="false"></button><button type="button" class="swatch blue" data-color="blue" aria-label="Blue" aria-pressed="false"></button><button type="button" class="swatch green" data-color="green" aria-label="Green" aria-pressed="false"></button><button type="button" class="swatch yellow" data-color="yellow" aria-label="Yellow" aria-pressed="false"></button></div><div class="dialog-actions"><button type="button" class="text-button danger" data-action="remove">Remove step</button><button class="button" type="submit">Keep this change <?= icon('check') ?></button></div></form></dialog>
<dialog id="rename-dialog" class="small-dialog"><div class="dialog-heading"><span class="eyebrow">NAME THE THOUGHT</span><button class="icon-button" type="button" data-close aria-label="Close rename dialog"><?= icon('close') ?></button></div><h2>What are we mapping?</h2><form id="rename-form"><label for="draft-name">Draft name</label><input id="draft-name" type="text" maxlength="60" required autocomplete="off"><div class="dialog-actions"><button type="submit" class="button">That's the one <?= icon('check') ?></button></div></form></dialog>
<dialog id="drafts-dialog" class="small-dialog drafts-dialog"><div class="dialog-heading"><span class="eyebrow">YOUR LITTLE COLLECTION</span><button class="icon-button" type="button" data-close aria-label="Close saved drafts"><?= icon('close') ?></button></div><h2>Thoughts for later.</h2><p class="dialog-description">Saved in this browser, on this device.</p><div id="draft-list"></div><p class="storage-note">Clearing browser data removes these drafts. Export an SVG to keep a separate copy.</p></dialog>
<dialog id="info-dialog" class="small-dialog"><div class="dialog-heading"><span class="eyebrow">A LITTLE HELP</span><button class="icon-button" type="button" data-close aria-label="Close information"><?= icon('close') ?></button></div><h2 id="info-title"></h2><div id="info-content" class="info-content"></div></dialog>
<dialog id="present-dialog" class="presentation-dialog"><div class="presentation-top"><span class="brand handwritten">draftline / a little walkthrough</span><button class="icon-button" type="button" data-close aria-label="Close presentation"><?= icon('close') ?></button></div><div class="presentation-content"><span class="eyebrow" id="present-count"></span><div class="present-card" id="present-card"><h2 id="present-label"></h2></div><p>One step closer to the whole picture.</p></div><div class="presentation-controls"><button type="button" class="button button-light" id="present-prev">← Previous</button><span id="present-dots" aria-hidden="true"></span><button type="button" class="button" id="present-next">Next step →</button></div></dialog>
<div class="toast" role="status" aria-live="polite" id="toast"></div>
<?php }
function specimen(int $kind): void { ?>
<div class="specimen specimen-<?= $kind ?> dots" aria-hidden="true">
<?php if ($kind === 0): ?><div class="tiny-input"><span class="orange">✎</span> A hello → A first try → A little win <span>↵</span></div><div class="specimen-flow"><span class="mini-node peach">A hello</span><span>⟶</span><span class="mini-node lilac">A first try</span><span>⟶</span><span class="mini-node green">A little win</span></div><span class="tiny-note">your words, connected.</span>
<?php elseif ($kind === 1): ?><div class="specimen-flow primitives"><span class="mini-node lilac">Explore</span><span>⟶</span><span class="mini-diamond"><span>Ready?</span></span><span>⟶</span><span class="mini-node green">Let's go</span></div><div class="mini-metrics"><span><i class="dot peach"></i> Starting point</span><span><i class="dot blue"></i> Step</span><span><i class="dot green"></i> Decision</span></div>
<?php elseif ($kind === 2): ?><div class="style-tabs"><span>Sketch</span><span>Clean</span></div><div class="style-examples"><span class="mini-node lilac">A rough thought</span><span class="mini-node blue clean-node">A clear thought</span></div>
<?php elseif ($kind === 3): ?><div class="mini-slide"><span class="tiny-label">STEP 02 OF 04</span><span class="mini-node peach">Try something small</span><div class="slide-dots"><i></i><i class="active"></i><i></i><i></i></div></div>
<?php elseif ($kind === 4): ?><div class="export-file"><span class="file-corner"></span><div class="file-flow"><i class="lilac"></i><span>→</span><i class="green"></i></div><span>the-whole-picture.svg</span></div><span class="export-badge">SVG ↗</span>
<?php elseif ($kind === 5): ?><div class="saved-scene"><div><span class="mini-doc-icon">▧</span><span>The first idea<small>A starting point for the team</small></span><span class="save-tick">✓</span></div><div><span class="mini-doc-icon">▧</span><span>Making it simpler<small>A clearer path through onboarding</small></span><span class="save-tick">✓</span></div><span class="local-caption"><i class="dot green"></i> Kept safe in this browser</span></div>
<?php else: ?><div class="template-scene"><div class="tiny-template"><span class="tiny-label">ONBOARDING</span><div><i class="peach"></i><span>→</span><i class="lilac"></i><span>→</span><i class="green"></i></div></div><div class="tiny-template"><span class="tiny-label">CHECKOUT</span><div><i class="blue"></i><span>→</span><i class="peach"></i><span>→</span><i class="green"></i></div></div><span class="tiny-note">borrow a beginning. make it yours.</span></div>
<?php endif; ?></div>
<?php }
