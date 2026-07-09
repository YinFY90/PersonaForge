let selectedPreset = null;
let forgedPersona = null;
let messages = [];
let isStreaming = false;
let apiConfig = null;

function loadApiConfig(){
  try{
    const saved = localStorage.getItem('pf_api_config');
    if(saved) apiConfig = JSON.parse(saved);
  }catch(e){}
}
function saveApiConfig(){
  const endpoint = document.getElementById('apiEndpoint').value.trim();
  const key = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('apiModel').value.trim() || 'gpt-4o-mini';
  if(!endpoint||!key){alert('请填写 API Endpoint 和 API Key');return}
  apiConfig = {endpoint,key,model};
  localStorage.setItem('pf_api_config',JSON.stringify(apiConfig));
  document.getElementById('apiSetup').style.display='none';
  document.getElementById('chatWrap').classList.add('active');
  if(forgedPersona) initChat();
}
loadApiConfig();

function renderPresets(){
  const grid = document.getElementById('presetGrid');
  grid.innerHTML = '';
  Object.entries(PRESETS).forEach(([key,p])=>{
    const el = document.createElement('div');
    el.className='preset-card'+(selectedPreset===key?' selected':'');
    el.innerHTML=`<div class="preset-avatar">${p.avatar}</div><h6>${p.name}</h6><p>${p.title}</p>`;
    el.onclick=()=>{selectedPreset=key;document.getElementById('customName').value='';renderPresets()};
    grid.appendChild(el);
  });
}
renderPresets();

function setForgeStep(step){
  document.querySelectorAll('.forge-step').forEach((el,i)=>{
    el.classList.remove('active','done');
    if(i<step)el.classList.add('done');
    if(i===step)el.classList.add('active');
  });
}

async function startForge(){
  let persona, materials;
  const customName = document.getElementById('customName').value.trim();
  const customMaterial = document.getElementById('customMaterial').value.trim();

  if(selectedPreset){
    persona = PRESETS[selectedPreset];
    materials = persona.material;
  }else if(customName){
    persona = {name:customName,enName:customName,avatar:customName[0],title:'自定义人物',tagline:''};
    materials = customMaterial || `请基于${customName}的公开知识、思想和表达风格，生成最能代表TA的system prompt。`;
  }else{
    alert('请选择预设人物或输入自定义人物名称');return;
  }

  if(!apiConfig){
    document.getElementById('forgePanelTitle').textContent='需要配置 LLM 接口';
    document.getElementById('forgePanelHint').textContent='锻造需要调用 LLM，请先配置 API';
    document.getElementById('forgeStep0').style.display='none';
    document.getElementById('forgeStep1').style.display='block';
    document.getElementById('forgeOutput').innerHTML='<div style="text-align:center;padding:40px 0"><p style="color:var(--text-secondary);margin-bottom:20px">锻造过程需要调用真实 LLM 来提炼人物原则并生成 system prompt。<br>这正是 PersonaForge 区别于模板方案的核心——每个人物的 Agent 都是 LLM 基于资料实时锻造的。</p><button class="btn-primary" onclick="openSettingsForForge()">配置 API 后继续</button></div>';
    setForgeStep(0);
    return;
  }

  document.getElementById('forgePanelTitle').textContent=`正在锻造：${persona.name}`;
  document.getElementById('forgePanelHint').textContent='LLM 正在提炼原则、构建思考框架、校准表达风格...';
  document.getElementById('forgeStep0').style.display='none';
  document.getElementById('forgeStep1').style.display='block';
  document.getElementById('forgeOutput').innerHTML='';
  document.getElementById('enterChatBtn').style.display='none';
  setForgeStep(1);

  const systemPrompt = await callLLM(buildForgePrompt(persona, materials), (chunk)=>{
    appendForgeOutput(chunk);
  }, true);

  if(systemPrompt){
    forgedPersona = {
      name: persona.name,
      avatar: persona.avatar,
      title: persona.title,
      systemPrompt: buildChatSystemPrompt(systemPrompt.trim()),
      presetQs: persona.presetQs || ['你是谁？','你最核心的思想是什么？','给我一些建议']
    };
    setForgeStep(3);
    document.getElementById('forgePanelTitle').textContent=`锻造完成：${persona.name}`;
    document.getElementById('forgePanelHint').textContent='Agent 已就绪，可以开始对话';
    appendForgeOutput('\n\n━━━ 锻造完成 ━━━\n\nAgent 的"灵魂"已注入 system prompt。点击下方按钮进入对话，你可以在对话界面查看完整的锻造档案。');
    document.getElementById('enterChatBtn').style.display='inline-flex';
  }else{
    appendForgeOutput('\n\n[锻造失败，请检查 API 配置后重试]');
  }
}

function appendForgeOutput(text){
  const out = document.getElementById('forgeOutput');
  const cursor = out.querySelector('.forge-cursor');
  if(cursor) cursor.remove();
  out.textContent += text;
  const c = document.createElement('span');c.className='forge-cursor';
  out.appendChild(c);
  out.scrollTop = out.scrollHeight;
}

function resetForge(){
  selectedPreset=null;
  document.getElementById('customName').value='';
  document.getElementById('customMaterial').value='';
  document.getElementById('forgeStep0').style.display='block';
  document.getElementById('forgeStep1').style.display='none';
  document.getElementById('forgeOutput').innerHTML='';
  document.getElementById('forgePanelTitle').textContent='选择人物';
  document.getElementById('forgePanelHint').textContent='第一步：选择你要锻造的人物';
  setForgeStep(0);renderPresets();
}

function openSettingsForForge(){
  openChat();
}

function enterChat(){
  openChat();initChat();
}

function openChat(){
  document.getElementById('chatOverlay').classList.add('active');
  document.body.style.overflow='hidden';
  if(apiConfig && forgedPersona){
    document.getElementById('apiSetup').style.display='none';
    document.getElementById('chatWrap').classList.add('active');
  }else{
    document.getElementById('apiSetup').style.display='flex';
    document.getElementById('chatWrap').classList.remove('active');
  }
}

function closeChat(){
  document.getElementById('chatOverlay').classList.remove('active');
  document.body.style.overflow='';
  hideSystemPrompt();
}

function initChat(){
  if(!forgedPersona)return;
  messages = [{role:'system',content:forgedPersona.systemPrompt}];
  document.getElementById('chatTitle').innerHTML=`${forgedPersona.name} <span>Agent</span>`;
  document.getElementById('chatMessages').innerHTML='';
  addAgentMessage(`你好，我是${forgedPersona.name}。有什么想聊的？`);
  const bar = document.getElementById('presetBar');
  bar.innerHTML='';
  forgedPersona.presetQs.forEach(q=>{
    const b=document.createElement('button');b.className='preset-chip';b.textContent=q;
    b.onclick=()=>{document.getElementById('chatInput').value=q;sendChatMessage()};
    bar.appendChild(b);
  });
  hideSystemPrompt();
}

function addAgentMessage(text){
  const wrap=document.getElementById('chatMessages');
  const el=document.createElement('div');el.className='msg msg-agent';
  el.innerHTML=`<div class="msg-meta">${forgedPersona?.name||'Agent'} <span class="badge">LLM</span></div><div>${escapeHtml(text).replace(/\n/g,'<br>')}</div>`;
  wrap.appendChild(el);wrap.scrollTop=wrap.scrollHeight;
}
function addUserMessage(text){
  const wrap=document.getElementById('chatMessages');
  const el=document.createElement('div');el.className='msg msg-user';el.textContent=text;
  wrap.appendChild(el);wrap.scrollTop=wrap.scrollHeight;
}
function escapeHtml(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

async function sendChatMessage(){
  const input=document.getElementById('chatInput');
  const text=input.value.trim();
  if(!text||isStreaming||!apiConfig||!forgedPersona)return;
  if(!forgedPersona){alert('请先锻造或选择一个人物 Agent');return}
  addUserMessage(text);input.value='';messages.push({role:'user',content:text});
  isStreaming=true;
  document.getElementById('chatSendBtn').disabled=true;

  const wrap=document.getElementById('chatMessages');
  const typingEl=document.createElement('div');typingEl.className='msg-typing';typingEl.id='typingEl';
  typingEl.innerHTML=`<div class="msg-meta">${forgedPersona.name} <span class="badge">思考中</span></div><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  wrap.appendChild(typingEl);wrap.scrollTop=wrap.scrollHeight;

  try{
    let firstChunk = true;
    const reply = await callLLMMessages(messages,(chunk)=>{
      if(firstChunk){
        typingEl.remove();
        const el=document.createElement('div');el.className='msg msg-agent';el.id='streamingMsg';
        el.innerHTML=`<div class="msg-meta">${forgedPersona.name} <span class="badge">LLM</span></div><span class="stream-content"></span><span class="forge-cursor"></span>`;
        wrap.appendChild(el);
        firstChunk=false;
      }
      const sc = document.querySelector('#streamingMsg .stream-content');
      if(sc) sc.innerHTML += escapeHtml(chunk).replace(/\n/g,'<br>');
      wrap.scrollTop=wrap.scrollHeight;
    });
    if(reply){
      const streamEl = document.getElementById('streamingMsg');
      if(streamEl){
        const cursor = streamEl.querySelector('.forge-cursor');if(cursor)cursor.remove();
        streamEl.removeAttribute('id');
      }
      messages.push({role:'assistant',content:reply});
    }
  }catch(e){
    typingEl.remove();const streamEl=document.getElementById('streamingMsg');if(streamEl)streamEl.remove();
    addAgentMessage('（连接出错了，请检查 API 配置。错误：'+e.message+'）');
  }
  isStreaming=false;
  document.getElementById('chatSendBtn').disabled=false;
}

async function callLLM(prompt, onChunk, stream){
  return callLLMMessages([{role:'user',content:prompt}], onChunk, stream);
}

async function callLLMMessages(msgs, onChunk, stream=true){
  if(!apiConfig)throw new Error('未配置 API');
  const body = {
    model: apiConfig.model,
    messages: msgs,
    temperature: 0.85,
    max_tokens: 2048,
    stream: !!stream
  };
  const resp = await fetch(apiConfig.endpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiConfig.key},
    body:JSON.stringify(body)
  });
  if(!resp.ok){
    const errTxt = await resp.text();
    throw new Error(`API ${resp.status}: ${errTxt.slice(0,300)}`);
  }
  if(!stream){
    const data = await resp.json();
    return data.choices[0].message.content;
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  while(true){
    const {done,value} = await reader.read();
    if(done)break;
    buffer += decoder.decode(value,{stream:true});
    const lines = buffer.split('\n');
    buffer = lines.pop()||'';
    for(const line of lines){
      const trimmed = line.trim();
      if(!trimmed||!trimmed.startsWith('data:'))continue;
      const data = trimmed.slice(5).trim();
      if(data==='[DONE]')continue;
      try{
        const j = JSON.parse(data);
        const delta = j.choices?.[0]?.delta?.content || '';
        if(delta){
          fullText += delta;
          if(onChunk)onChunk(delta);
        }
      }catch(e){}
    }
  }
  return fullText;
}

function showSystemPrompt(){
  if(!forgedPersona){alert('请先锻造一个 Agent');return;}
  document.getElementById('chatWrap').classList.remove('active');
  document.getElementById('apiSetup').style.display='none';
  const sp = document.getElementById('spViewer');sp.classList.add('active');
  const sections = forgedPersona.systemPrompt.split('\n\n');
  const content = document.getElementById('spContent');
  content.innerHTML = '';
  const sectionNames = {'【身份定义】':'身份定义','【你的核心原则】':'核心原则','【你的表达风格】':'表达风格','【回答要求】':'回答规则','【重要运行规则】':'运行约束'};
  let current = null;
  sections.forEach(s=>{
    const titleMatch = s.match(/【(.+?)】/);
    if(titleMatch){
      if(current){
        const box = document.createElement('div');box.className='sp-section';
        const title = sectionNames['【'+titleMatch[1]+'】']||current.title;
        box.innerHTML=`<h5>${current.title}</h5><div style="white-space:pre-wrap;font-size:13px;color:var(--text-secondary);line-height:1.7">${escapeHtml(current.body.join('\n\n'))}</div>`;
        content.appendChild(box);
      }
      current = {title: sectionNames['【'+titleMatch[1]+'】']||titleMatch[1], body:[s.replace(/【.+?】\s*/,'')]};
    }else if(current){
      current.body.push(s);
    }
  });
  if(current){
    const box = document.createElement('div');box.className='sp-section';
    box.innerHTML=`<h5>${current.title}</h5><div style="white-space:pre-wrap;font-size:13px;color:var(--text-secondary);line-height:1.7">${escapeHtml(current.body.join('\n\n'))}</div>`;
    content.appendChild(box);
  }
}
function hideSystemPrompt(){
  document.getElementById('spViewer').classList.remove('active');
  if(apiConfig && forgedPersona) document.getElementById('chatWrap').classList.add('active');
}

function clearChat(){
  if(!forgedPersona)return;
  messages = [{role:'system',content:forgedPersona.systemPrompt}];
  document.getElementById('chatMessages').innerHTML='';
  addAgentMessage('对话已清空。我们重新开始吧。');
}

function showSettings(){
  document.getElementById('chatOverlay').classList.add('active');
  document.body.style.overflow='hidden';
  document.getElementById('chatWrap').classList.remove('active');
  document.getElementById('spViewer').classList.remove('active');
  document.getElementById('apiSetup').style.display='flex';
  if(apiConfig){
    document.getElementById('apiEndpoint').value=apiConfig.endpoint;
    document.getElementById('apiKey').value=apiConfig.key;
    document.getElementById('apiModel').value=apiConfig.model;
  }
}

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.getElementById('chatOverlay').classList.contains('active')){
    if(document.getElementById('spViewer').classList.contains('active')){hideSystemPrompt()}
    else closeChat();
  }
});

(function renderPersonaGrid(){
  const grid=document.getElementById('personaGrid');
  Object.entries(PRESETS).forEach(([k,p])=>{
    const el=document.createElement('div');el.className='persona-card';
    el.innerHTML=`<div class="avatar">${p.avatar}</div><h4>${p.name}</h4><div class="title">${p.title}</div><p>"${p.tagline}"</p><button class="chat-btn">开始锻造 →</button>`;
    el.onclick=()=>{
      selectedPreset=k;renderPresets();
      document.getElementById('forge').scrollIntoView({behavior:'smooth'});
    };
    grid.appendChild(el);
  });
})();

const io = new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)'}});
},{threshold:.1});
document.querySelectorAll('.section,.forge-section .forge-inner,.cta-block').forEach(s=>{
  s.style.opacity='0';s.style.transform='translateY(24px)';s.style.transition='opacity .6s ease, transform .6s ease';
  io.observe(s);
});

// ==================== SCREENSHOT MODE ====================
// 通过 URL 参数 ?shot=1/2/3/4 直接打开对应界面，方便截图
const DEMO_SP = `你是沃伦·巴菲特，伯克希尔·哈撒韦董事长，价值投资之父，奥马哈的先知。

【身份定义】
你是沃伦·巴菲特，全球最成功的价值投资者之一。你用一辈子践行"买好公司、长期持有"的简单道理，靠复利成为世界首富之一。你的风格是平实、幽默、说人话。

【你的核心原则】
1. 能力圈原则：只投资你能理解的生意。"能力圈的大小并不重要，知道它的边界才重要。"
2. 安全边际：买入价格必须远低于内在价值。"用4毛钱买1块钱的东西。"
3. 市场先生：市场是服务你的，不是指导你的。市场每天报价，有时乐观有时悲观，你可以选择利用或忽略。
4. 复利思维："人生就像滚雪球，需要很湿的雪和很长的坡。"
5. 把股票当成企业的一部分来持有，而非交易筹码。"如果你不想持有一只股票十年，就不要持有十分钟。"
6. 护城河：投资有持久竞争优势的企业。

【你的表达风格】
语气平实幽默，像奥马哈的智慧老人；善用农场比喻、棒球比喻、市场先生寓言；第一人称"我们"，亲切不说教；经常自嘲；说人话不用术语；偶尔用反问。

【回答要求】
- 用你的思维框架分析问题，不要用通用AI套话
- 适当引用经典观点或比喻
- 如果问题不在你的领域内，坦承"这不是我擅长的领域"
- 不要给出具体买卖建议，而是讲原则和思考方式
- 如果用户只说"hi""你好"，用你的风格自然简短回应

【重要运行规则】
- 你现在就是沃伦·巴菲特。用第一人称"我"说话。
- 回答要简洁有力，不要长篇大论说废话。
- 像真人对话一样自然，有态度，有个性。`;

const DEMO_FORGE_OUTPUT = `【身份定义】
你是沃伦·巴菲特，伯克希尔·哈撒韦董事长，价值投资之父，奥马哈的先知。你用一辈子践行"买好公司、长期持有"的简单道理，靠复利成为世界首富之一。

【你的核心原则】
1. 能力圈原则：只投资你能理解的生意。"能力圈的大小并不重要，知道它的边界才重要。"不要为了看起来聪明而跨出能力圈。
2. 安全边际：买入价格必须远低于内在价值，给判断错误留余地。"用4毛钱买1块钱的东西。"
3. 市场先生寓言：市场是服务你的，不是指导你的。市场每天报一个价格，有时乐观有时悲观，你可以选择利用或忽略。
4. 复利思维：时间是优秀企业的朋友，是平庸企业的敌人。"人生就像滚雪球，需要很湿的雪和很长的坡。"
5. 把股票当成企业的一部分来持有，而非交易筹码。"如果你不想持有一只股票十年，就不要持有十分钟。"
6. 护城河：投资有持久竞争优势的企业——品牌、成本优势、网络效应、转换成本。

【你的表达风格】
语气平实幽默，像奥马哈的智慧老人；善用农场比喻、棒球比喻、市场先生寓言；第一人称"我们"，亲切不说教；经常自嘲；说人话不用术语；偶尔用反问。简短问候时自然回应，不自动长篇大论。

【回答要求】
- 回答前先想"巴菲特会怎么回答这个问题"
- 用价值投资思维框架分析问题，不要用通用AI套话
- 适当引用经典观点或比喻（市场先生、滚雪球、能力圈）
- 如果问题不在投资领域，坦承"这不是我擅长的领域"
- 区分事实判断和个人观点，观点可以说"我的看法是..."
- 不要给出具体买卖建议，而是讲原则和思考方式
- 回答要有"人味"，不要像百科词条
- 如果用户只说"hi""你好"之类的简短问候，自然简短回应（1-2句话即可）`;

(function initScreenshotMode(){
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if(!shot) return;

  // 禁用滚动动画，直接显示
  document.querySelectorAll('.section,.forge-section .forge-inner,.cta-block').forEach(s=>{
    s.style.opacity='1';s.style.transform='none';s.style.transition='none';
  });

  if(shot==='1'){
    // 锻造台主界面
    setTimeout(()=>document.getElementById('forge').scrollIntoView(),100);
  }
  else if(shot==='2'){
    // 锻造过程流式输出（预填）
    selectedPreset='buffett';
    setForgeStep(1);
    document.getElementById('forgeStep0').style.display='none';
    document.getElementById('forgeStep1').style.display='block';
    document.getElementById('forgePanelTitle').textContent='正在锻造：沃伦·巴菲特';
    document.getElementById('forgePanelHint').textContent='LLM 正在提炼原则、构建思考框架、校准表达风格...';
    document.getElementById('forgeOutput').textContent = DEMO_FORGE_OUTPUT;
    document.getElementById('enterChatBtn').style.display='inline-flex';
    forgedPersona = {
      name:'沃伦·巴菲特',avatar:'B',title:'价值投资之父',
      systemPrompt:DEMO_SP,
      presetQs:['如何判断一家公司是否值得长期持有？','什么是能力圈？我怎么找到自己的能力圈？','市场大跌时你怎么想？','为什么大多数人投资亏钱？']
    };
    setTimeout(()=>document.getElementById('forge').scrollIntoView(),100);
  }
  else if(shot==='3'){
    // 对话界面（预填对话）
    forgedPersona = {
      name:'沃伦·巴菲特',avatar:'B',title:'价值投资之父',
      systemPrompt:DEMO_SP,
      presetQs:['如何判断一家公司是否值得长期持有？','什么是能力圈？我怎么找到自己的能力圈？','市场大跌时你怎么想？','为什么大多数人投资亏钱？']
    };
    apiConfig = {endpoint:'demo',key:'demo',model:'demo'};
    openChat();
    initChat();
    // 预填对话
    document.getElementById('chatMessages').innerHTML='';
    addAgentMessage('你好，我是沃伦·巴菲特。有什么想聊的？');
    addUserMessage('什么是能力圈？我怎么找到自己的能力圈？');
    addAgentMessage('能力圈这个词听起来很玄，其实很简单——就是你能真正看懂的生意范围。\n\n我从来不投资我看不懂的东西。当年互联网泡沫的时候，很多人说我落伍了，但我不投是因为我确实看不懂那些公司的商业模式。后来泡沫破了，那些看不懂的人亏了钱。\n\n怎么找到自己的能力圈？问自己一个问题：这个生意我能不能用一句话说清楚它怎么赚钱？如果说不出，那你可能不在能力圈内。\n\n能力圈不在于多大，在于你知道它的边界在哪。这比圈本身大得多更重要。');
  }
  else if(shot==='4'){
    // System Prompt 档案查看
    forgedPersona = {
      name:'沃伦·巴菲特',avatar:'B',title:'价值投资之父',
      systemPrompt:DEMO_SP,
      presetQs:[]
    };
    apiConfig = {endpoint:'demo',key:'demo',model:'demo'};
    openChat();
    document.getElementById('chatWrap').classList.remove('active');
    document.getElementById('apiSetup').style.display='none';
    showSystemPrompt();
  }
})();
