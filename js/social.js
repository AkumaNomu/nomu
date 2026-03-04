/* ================================================================
   REACTIONS
================================================================ */
const REACTION_TYPES=[
  {l:'like',name:'Like',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-2 7"/><path d="M7 22h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v9z"/></svg>'},
  {l:'dislike',name:'Dislike',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l2-7"/><path d="M17 2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V2z"/></svg>'},
];

function actionIcon(type){
  if(type==='reply') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-1a4 4 0 0 0-4-4H4"/></svg>';
  if(type==='heart') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 7.6A5.5 5.5 0 0 0 12 5.4 5.5 5.5 0 0 0 3.2 7.6c0 7 8.8 11.8 8.8 11.8s8.8-4.8 8.8-11.8z"/></svg>';
  return '';
}

function renderReactions(pid){
  const pr=REACTIONS[pid]||{};
  const mountId = arguments.length > 1 ? arguments[1] : 'reactions';
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML=
    `<span class="r-label">React</span>`+
    `<div class="r-stack">`+
    REACTION_TYPES.map(r=>{
      const cnt=pr[r.l]||0;
      const done=pr['_'+r.l];
      return `<button class="r-btn ${done?'reacted':''}" title="${r.name}" onclick="doReact('${pid}','${r.l}')"><span class="r-icon">${r.icon}</span><span class="r-count">${cnt}</span></button>`;
    }).join('')+
    `</div>`;
}

function doReact(pid,label){
  if(!REACTIONS[pid]) REACTIONS[pid]={};
  const pr=REACTIONS[pid];
  const key='_'+label;
  if(pr[key]){
    pr[label]=Math.max(0,(pr[label]||0)-1);
    pr[key]=false;
  }else{
    pr[label]=(pr[label]||0)+1;
    pr[key]=true;
    toast('Reaction added!');
  }
  localStorage.setItem('v2_reactions',JSON.stringify(REACTIONS));
  renderReactions(pid);
  if (typeof syncHeaderReactionButtons === 'function') syncHeaderReactionButtons(pid);
}

/* ================================================================
   SHARE
================================================================ */
function renderShareBar(p){
  const mountId = arguments.length > 1 ? arguments[1] : 'share-row';
  const mount = document.getElementById(mountId);
  if (!mount) return;
  if (!p) {
    mount.innerHTML = '';
    return;
  }
  const url=encodeURIComponent(location.href+'#'+p.id);
  const text=encodeURIComponent(p.title);
  mount.innerHTML=`
    <span class="share-lbl">Share</span>
    <div class="share-mini">
      <button class="share-btn share-mini-btn" onclick="navigator.clipboard.writeText(location.href+'#${p.id}').then(()=>toast('Link copied!'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
      </button>
      <a class="share-btn share-mini-btn" href="https://twitter.com/intent/tweet?url=${url}&text=${text}" target="_blank">
        <svg class="x-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.737l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.905-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/></svg> Post
      </a>
    </div>`;
}

/* ================================================================
   COMMENTS
================================================================ */
const AVATAR_COLORS=['#00d4b4','#a855f7','#ec4899','#f59e0b','#22c55e','#3b82f6','#ef4444'];
function getAv(name){return AVATAR_COLORS[name.charCodeAt(0)%AVATAR_COLORS.length]}
function getInitials(name){return name.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2)||'??'}

function renderComments(pid, mountId = 'comments-section'){
  const all=COMMENTS[pid]||[];
  const top=all.filter(c=>!c.replyTo);
  const count=all.length;
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML=`
    <div class="comments-mini">
      <div class="comments-mini-head">
        <span>Comments</span>
        <span class="comment-count-badge">${count}</span>
      </div>
      <div class="comments-mini-form">
        <input type="text" id="c-name" placeholder="Name" />
        <textarea id="c-body" placeholder="Add a comment..."></textarea>
        <button class="btn btn-primary btn-mini" onclick="submitComment('${pid}',null,'c-name','c-body')">Post</button>
      </div>
      <div class="comment-mini-list" id="comment-list">
        ${top.length ? top.map(c=>renderComment(c,all,pid)).join('') : renderPlaceholderComments()}
      </div>
    </div>`;
}

function renderComment(c,all,pid){
  const replies=all.filter(r=>r.replyTo===c.id);
  return `
    <div class="comment-mini" id="c-${c.id}">
      <div class="comment-mini-meta">
        <span class="comment-mini-author">${escHtml(c.name)}</span>
        <span class="comment-mini-date">${fmtDate(c.date)}</span>
        <button class="comment-mini-action" onclick="toggleReplyForm('${c.id}')">${actionIcon('reply')} Reply</button>
        ${c.likes
          ? `<span class="comment-mini-like">${actionIcon('heart')} ${c.likes}</span>`
          : `<button class="comment-mini-action" onclick="likeComment('${pid}','${c.id}')">${actionIcon('heart')} Like</button>`}
      </div>
      <div class="comment-mini-body">${escHtml(c.body)}</div>
      <div class="reply-form" id="rf-${c.id}">
        <textarea id="rt-${c.id}" placeholder="Write a reply..."></textarea>
        <div class="reply-actions">
          <button class="btn btn-ghost btn-mini" onclick="toggleReplyForm('${c.id}')">Cancel</button>
          <button class="btn btn-primary btn-mini" onclick="submitComment('${pid}','${c.id}',null,'rt-${c.id}')">Reply</button>
        </div>
      </div>
      ${replies.map(r=>renderComment(r,[],pid)).join('')}
    </div>`;
}

function toggleReplyForm(cid){
  const rf=document.getElementById('rf-'+cid);
  if(rf) rf.classList.toggle('open');
}

function submitComment(pid,replyTo,nameId='c-name',bodyId='c-body'){
  const nameEl=replyTo?null:(nameId?document.getElementById(nameId):null);
  const bodyEl=document.getElementById(replyTo?`rt-${replyTo}`:bodyId);
  const name=nameEl?.value?.trim()||localStorage.getItem('comment_name')||'Anonymous';
  const body=bodyEl?.value?.trim();
  if(!body){toast('Please write something first.');return;}
  if(nameEl?.value?.trim()) localStorage.setItem('comment_name',nameEl.value.trim());
  if(!COMMENTS[pid]) COMMENTS[pid]=[];
  const c={
    id:Date.now().toString(36)+Math.random().toString(36).slice(2),
    name,body,date:new Date().toISOString(),
    replyTo:replyTo||null,likes:0,
  };
  COMMENTS[pid].push(c);
  localStorage.setItem('v2_comments',JSON.stringify(COMMENTS));
  toast('Comment posted!');
  renderComments(pid);
  if (bodyEl) bodyEl.value = '';
  const newNameEl=document.getElementById('c-name');
  if(newNameEl) newNameEl.value=localStorage.getItem('comment_name')||'';
}

function likeComment(pid,cid){
  const c=COMMENTS[pid]?.find(x=>x.id===cid);
  if(c){
    c.likes=(c.likes||0)+1;
    localStorage.setItem('v2_comments',JSON.stringify(COMMENTS));
    renderComments(pid);
  }
}

function escHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderPlaceholderComments(){
  const placeholders = [
    { name: 'Ari', body: 'Great breakdown — the pacing section helped a ton.', date: '2026-03-01T10:12:00.000Z' },
    { name: 'Lea', body: 'The examples made this click for me. Thanks!', date: '2026-03-02T15:24:00.000Z' },
    { name: 'Mo', body: 'Clean write‑up. Would love a follow‑up with more clips.', date: '2026-03-03T18:05:00.000Z' },
  ];
  return placeholders.map(p => `
    <div class="comment-mini placeholder">
      <div class="comment-mini-meta">
        <span class="comment-mini-author">${p.name}</span>
        <span class="comment-mini-date">${fmtDate(p.date)}</span>
      </div>
      <div class="comment-mini-body">${p.body}</div>
    </div>`).join('');
}

function renderCommentComposer(pid, mountId = 'actions-comment') {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const nameId = `${mountId}-name`;
  const bodyId = `${mountId}-body`;
  mount.innerHTML = `
    <div class="comments-mini">
      <div class="comments-mini-head">
        <span>Add a comment</span>
      </div>
      <div class="comments-mini-form">
        <input type="text" id="${nameId}" placeholder="Name" />
        <textarea id="${bodyId}" placeholder="Add a comment..."></textarea>
        <button class="btn btn-primary btn-mini" onclick="submitComment('${pid}',null,'${nameId}','${bodyId}')">Post</button>
      </div>
    </div>`;
  const nameEl = document.getElementById(nameId);
  if (nameEl) nameEl.value = localStorage.getItem('comment_name') || '';
}

function openActionsModal(pid) {
  const postId = pid || CUR_POST;
  if (!postId) return;
  const modal = document.getElementById('actions-modal');
  const body = document.getElementById('actions-modal-body');
  const post = DB.posts.find(p => p.id === postId);
  if (!modal || !body || !post) return;
  body.innerHTML = `
    <div class="actions-section">
      <div class="actions-label">Reactions</div>
      <div class="actions-slot" id="actions-reactions"></div>
    </div>
    <div class="actions-section">
      <div class="actions-label">Share</div>
      <div class="actions-slot" id="actions-share"></div>
    </div>
    <div class="actions-section">
      <div class="actions-label">Comment</div>
      <div class="actions-slot" id="actions-comment"></div>
    </div>`;
  renderReactions(postId, 'actions-reactions');
  renderShareBar(post, 'actions-share');
  renderCommentComposer(postId, 'actions-comment');
  modal.classList.add('open');
  document.body.classList.add('actions-open');
}

function closeActionsModal(event) {
  if (event && event.target && event.target.id !== 'actions-modal') return;
  const modal = document.getElementById('actions-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('actions-open');
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const modal = document.getElementById('actions-modal');
  if (!modal || !modal.classList.contains('open')) return;
  closeActionsModal();
});
