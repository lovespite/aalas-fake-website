"use strict";

/**
 * 使用政策弹层 (Usage Policy)
 * - 首次访问强制弹出，需阅读 ≥ 10s 后才能点击「我已知晓 / I Agree」
 * - 同意后写入 localStorage，下次不再弹出
 * - 可通过页脚的「使用政策」链接随时查看（已同意状态下查看模式无倒计时）
 */
(function () {
  const KEY = "aalas_exam_policy_accepted_v1";
  const REQUIRED_READ_SECONDS = 10;

  const POLICY_HTML = ` 
    <div class="copyright">版权所有 © 2026 Lovespite. 保留一切权利。</div>
    <p>欢迎使用本题库练习系统。在继续使用前，请认真阅读以下使用政策。继续访问、浏览或使用本系统，即表示您已阅读、理解并同意以下全部条款：</p>
    <ol>
      <li><strong>版权声明：</strong>本系统的程序代码、界面设计、整理后的题库结构及衍生数据，著作权均归 <em>Lovespite</em> 所有，受相关法律法规保护。</li>
      <li><strong>禁止商业用途：</strong>本系统及其全部内容仅供个人学习使用，不得以任何形式用于商业目的，包括但不限于销售、出租、付费培训、有偿咨询、广告投放等。</li>
      <li><strong>禁止拷贝、二次创作与再分发：</strong>未经著作权人书面许可，不得对本系统的代码、题库、界面或任何组成部分进行复制、改编、翻译、二次创作、镜像或以任何方式（包括网络）再分发。</li>
      <li><strong>仅限学习用途：</strong>本系统的唯一合法用途为个人学习与自我练习。严禁用于实际考试作弊、替考、商业化培训或任何违反所在地法律法规的场景。</li>
    </ol>
    <p>如您不同意上述任一条款，请立即停止使用并关闭本页面。</p>
 
    <div class="copyright">Copyright © 2026 Lovespite. All Rights Reserved.</div>
    <p>Welcome to this question-bank practice system. Please read the following usage policy carefully before continuing. By accessing, browsing, or otherwise using this system, you acknowledge that you have read, understood, and agreed to all of the terms below:</p>
    <ol>
      <li><strong>Copyright:</strong> All source code, UI design, organized question-bank structure, and derived data of this system are the intellectual property of <em>Lovespite</em>, protected by applicable laws.</li>
      <li><strong>No Commercial Use:</strong> This system and all of its contents are provided for personal learning purposes only. Any commercial use is strictly prohibited, including but not limited to selling, renting, paid training, paid consulting, or advertising.</li>
      <li><strong>No Copying, Derivative Works or Redistribution:</strong> You may not copy, adapt, translate, create derivative works from, mirror, or redistribute (including over networks) the code, question bank, UI, or any component of this system, in whole or in part, without prior written permission from the copyright holder.</li>
      <li><strong>Learning Use Only:</strong> The only permitted use of this system is personal study and self-practice. Using it to cheat in real exams, take exams on behalf of others, run commercialized training, or for any purpose that violates applicable laws and regulations is strictly prohibited.</li>
    </ol>
    <p>If you do not agree to any of the above terms, please stop using and close this page immediately.</p>
  `;

  function hasAccepted() {
    try { return localStorage.getItem(KEY) === "1"; } catch (_) { return false; }
  }
  function setAccepted() {
    try { localStorage.setItem(KEY, "1"); } catch (_) { }
  }

  function showPolicy(opts) {
    opts = opts || {};
    const viewOnly = !!opts.viewOnly;

    if (document.getElementById("policy-mask")) return;

    const mask = document.createElement("div");
    mask.className = "policy-mask";
    mask.id = "policy-mask";
    mask.innerHTML = `
      <div class="policy-modal" role="dialog" aria-modal="true" aria-labelledby="policy-title">
        <header>
          <h2 id="policy-title">使用政策 / Usage Policy</h2>
          <div class="sub">请阅读并同意以下条款 · Please read and accept the terms below</div>
        </header>
        <div class="policy-body">${POLICY_HTML}</div>
        <div class="policy-footer">
          <div class="hint" id="policy-hint"></div>
          <button class="btn ghost" id="policy-decline" style="display:none">拒绝 / Decline</button>
          <button class="btn" id="policy-accept" disabled>我已知晓 / I Agree</button>
        </div>
      </div>
    `;
    document.body.appendChild(mask);
    document.body.style.overflow = "hidden";

    const $accept = mask.querySelector("#policy-accept");
    const $decline = mask.querySelector("#policy-decline");
    const $hint = mask.querySelector("#policy-hint");

    function close() {
      mask.remove();
      document.body.style.overflow = "";
    }

    if (viewOnly) {
      // 已同意状态下查看：无需倒计时
      $accept.disabled = false;
      $accept.textContent = "关闭 / Close";
      $hint.innerHTML = `<span class="muted">您已于此前同意本政策。 / You have previously accepted this policy.</span>`;
      $accept.addEventListener("click", close);
      return;
    }

    // 首次同意流程：强制阅读 10s
    let remaining = REQUIRED_READ_SECONDS;
    function updateHint() {
      $hint.innerHTML = `请阅读 <span class="countdown">${remaining}</span> 秒后方可同意 · You can agree after reading for <span class="countdown">${remaining}</span>s.`;
    }
    updateHint();

    $decline.style.display = "";
    $decline.addEventListener("click", async () => {
      await Modal.alert(
        "您已选择拒绝本使用政策，将无法继续使用本系统。\nYou have declined the policy and cannot use this system.",
        { title: "已拒绝 / Declined", type: "danger", okText: "关闭 / Close" }
      );
      window.location.href = "about:blank";
    });

    const timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        $accept.disabled = false;
        $hint.innerHTML = `<span style="color:#059669">阅读时间已满，您现在可以同意。 / You may now agree.</span>`;
      } else {
        updateHint();
      }
    }, 1000);

    $accept.addEventListener("click", () => {
      if ($accept.disabled) return;
      setAccepted();
      clearInterval(timer);
      close();
    });
  }

  // 暴露给页脚链接 & 调试
  window.AalasPolicy = {
    show: showPolicy,
    hasAccepted,
    reset: () => { try { localStorage.removeItem(KEY); } catch (_) { } },
  };

  document.addEventListener("DOMContentLoaded", () => {
    const link = document.getElementById("show-policy");
    if (link) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        showPolicy({ viewOnly: hasAccepted() });
      });
    }
    if (!hasAccepted()) showPolicy();
  });
})();
