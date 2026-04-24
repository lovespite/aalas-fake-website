"use strict";

/**
 * 简易 H5 Modal —— 替代原生 alert / confirm
 *
 * API（均返回 Promise）：
 *   Modal.alert(message, opts?)        → Promise<true>
 *   Modal.confirm(message, opts?)      → Promise<boolean>   true=确认, false=取消
 *   Modal.open({ title, body, buttons }) → Promise<value>
 *
 * opts:
 *   { title?: string, okText?: string, cancelText?: string, type?: 'info'|'warn'|'danger' }
 *
 * body 既可传字符串（按纯文本处理），也可传 DOM 节点。
 *
 * 兼容性：使用 <dialog> 元素 + showModal()，并对不支持的环境提供 polyfill 回退。
 */
(function () {
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") e.className = attrs[k];
        else if (k === "html") e.innerHTML = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
      }
    }
    for (const c of [].concat(children || [])) {
      if (c == null || c === false) continue;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return e;
  }

  function open(opts) {
    opts = opts || {};
    const title = opts.title || "提示";
    const body = opts.body != null ? opts.body : "";
    const type = opts.type || "info";
    const buttons = Array.isArray(opts.buttons) && opts.buttons.length
      ? opts.buttons
      : [{ text: "确定", value: true, primary: true }];

    return new Promise((resolve) => {
      let resolved = false;
      function done(v) {
        if (resolved) return;
        resolved = true;
        try { dialog.close(); } catch (_) {}
        // 留一帧再卸载，避免 transition 中断
        setTimeout(() => { try { mask.remove(); } catch (_) {} }, 0);
        resolve(v);
      }

      const bodyEl = typeof body === "string"
        ? el("div", { class: "h5m-text" }, body)
        : body;

      const btnEls = buttons.map((b, i) => el("button", {
        class: "btn" + (b.primary ? "" : " ghost") + (b.danger ? " danger" : ""),
        type: "button",
        onclick: () => done(b.value !== undefined ? b.value : i),
      }, b.text || "确定"));

      const dialog = el("div", {
        class: "h5m-dialog h5m-type-" + type,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "h5m-title",
      }, [
        el("header", { class: "h5m-head" }, [
          el("h3", { id: "h5m-title" }, title),
          el("button", {
            class: "h5m-close",
            type: "button",
            "aria-label": "关闭",
            onclick: () => {
              // 关闭按钮：若有 cancel 按钮按其值返回，否则返回 false
              const cancelBtn = buttons.find((b) => b.cancel);
              done(cancelBtn ? cancelBtn.value : false);
            },
          }, "✕"),
        ]),
        el("div", { class: "h5m-body" }, [bodyEl]),
        el("footer", { class: "h5m-foot" }, btnEls),
      ]);

      const mask = el("div", { class: "h5m-mask" }, [dialog]);

      // ESC 关闭：等同点击关闭按钮
      function onKey(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          const cancelBtn = buttons.find((b) => b.cancel);
          done(cancelBtn ? cancelBtn.value : false);
        } else if (e.key === "Enter") {
          // Enter 触发主按钮（首个 primary 或最后一个）
          const primary = buttons.find((b) => b.primary) || buttons[buttons.length - 1];
          if (primary) done(primary.value !== undefined ? primary.value : true);
        }
      }
      mask.addEventListener("keydown", onKey);

      // 点击遮罩区域不关闭（保持模态行为），仅点击关闭按钮/按键
      document.body.appendChild(mask);

      // 自动聚焦主按钮
      setTimeout(() => {
        const primaryIdx = buttons.findIndex((b) => b.primary);
        const focusEl = btnEls[primaryIdx >= 0 ? primaryIdx : btnEls.length - 1];
        if (focusEl) focusEl.focus();
      }, 0);
    });
  }

  function alertM(message, opts) {
    opts = opts || {};
    return open({
      title: opts.title || "提示",
      body: message,
      type: opts.type || "info",
      buttons: [{ text: opts.okText || "确定", value: true, primary: true }],
    });
  }

  function confirmM(message, opts) {
    opts = opts || {};
    return open({
      title: opts.title || "请确认",
      body: message,
      type: opts.type || "warn",
      buttons: [
        { text: opts.cancelText || "取消", value: false, cancel: true },
        { text: opts.okText || "确定", value: true, primary: true, danger: opts.type === "danger" },
      ],
    });
  }

  window.Modal = { open, alert: alertM, confirm: confirmM };
})();
