# PersonaForge

> 把人物资料锻造成可对话的 AI Agent —— 一套 LLM 驱动的生产方法。

PersonaForge 不是预设模板，而是通过真实 LLM 把人物的书、演讲、访谈、文章等资料"锻造"成结构化的 Agent 人格：先提炼决策原则、再重建思考框架、最后校准表达风格，生成一个真正用该人物思维方式回答问题的对话 Agent。

## 功能特性

- **人物锻造工作台**：选择预设人物或输入自定义人物与资料，由 LLM 实时提炼原则、构建思考框架、校准表达风格，流式生成 Agent 的 system prompt。
- **四层结构化 System Prompt**：身份定义、核心原则、表达风格、回答规则，让 LLM 像人物一样思考而非拼贴原文。
- **真实对话体验**：基于锻造出的 system prompt 与 Agent 多轮对话，支持流式输出、预设问题快捷发送。
- **锻造档案查看**：可在对话界面随时查看完整的 system prompt 结构，理解 Agent 是如何被构建的。
- **预设人物库**：内置巴菲特、马斯克、芒格、乔布斯等人物，即选即聊。
- **OpenAI 兼容接口**：支持 OpenAI、DeepSeek、火山方舟、月之暗面等任意兼容接口，API Key 仅保存在本地浏览器。
- **截图模式**：通过 URL 参数 `?shot=1/2/3/4` 直接打开对应界面，方便演示与截图。

## 技术栈

- 纯前端单页应用（HTML + CSS + 原生 JavaScript），无需后端、无需构建工具。
- OpenAI 兼容 API（Chat Completions，支持流式 SSE）。
- 数据与配置均存储于浏览器 localStorage。

## 项目结构

```
personaforge-demo/
├── index.html          # 纯 HTML 结构，引用外部 css/js
├── css/
│   └── style.css       # 全部样式
├── js/
│   ├── data.js         # PRESETS 数据 + buildForgePrompt + buildChatSystemPrompt
│   └── app.js          # 状态管理、锻造、对话、LLM 调用、截图模式等逻辑
└── README.md           # 项目说明
```

## 使用方法

1. **本地运行**：在 `personaforge-demo` 目录下启动任意静态服务器，例如：

   ```bash
   python3 -m http.server 8766
   ```

   然后浏览器打开 `http://localhost:8766/`。

2. **配置 API**：首次进入对话或锻造流程时，填写 OpenAI 兼容的 API Endpoint、API Key 和模型名（如 `gpt-4o-mini`、`deepseek-chat` 等），保存即可。配置仅存于本地 localStorage，不会上传。

3. **锻造人物 Agent**：在锻造台选择预设人物或输入自定义人物名称与资料，点击「开始锻造」，LLM 会流式生成该人物的 system prompt，完成后即可进入对话。

4. **直接对话**：也可以在「预设人物」区直接选择内置人物开始对话，无需走完整锻造流程。

5. **截图演示**：访问 `?shot=1`（锻造台）、`?shot=2`（锻造过程）、`?shot=3`（对话界面）、`?shot=4`（System Prompt 档案）查看预填演示界面。

## 在线体验

在线体验地址：https://yinfy90.github.io/PersonaForge/

---

本创意产物 HTML 由 TRAE Work 生成
