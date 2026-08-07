// VNRVJIET Campus AI Assistant — Featherless AI chatbot
(function () {
    'use strict';

    const SYSTEM_PROMPT = `You are CAMPUS-AI, the intelligent assistant for the VNRVJIET 3D Campus Procedural Inspector.

You help students, staff, and visitors navigate the VNR Vignana Jyothi Institute of Engineering & Technology campus using this web app.

Campus blocks: A-BLOCK, B-BLOCK, C-BLOCK, D-BLOCK, E-BLOCK, PG-BLOCK.

IMPORTANT: When the user asks for a route with a start point, end point, and/or fire/hazard location, the app automatically computes the real evacuation path using Dijkstra routing. You do NOT need to tell them to use the Route Finder manually for those requests — routing is handled by the system.

For general questions (not specific route requests), guide users on:
- Block Selector, Level Selector, Route Finder UI, ESP32 Hardware Monitor, campus macro view

Keep answers concise, friendly, and practical.`;

    const config = window.CAMPUS_AI_CONFIG || {};
    const state = {
        open: false,
        busy: false,
        listening: false,
        recognition: null,
        voiceBaseText: '',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }],
    };

    const els = {};

    function initChatbot() {
        els.toggle = document.getElementById('chatbot-toggle');
        els.panel = document.getElementById('chatbot-panel');
        els.close = document.getElementById('chatbot-close');
        els.messages = document.getElementById('chatbot-messages');
        els.form = document.getElementById('chatbot-form');
        els.input = document.getElementById('chatbot-input');
        els.voice = document.getElementById('chatbot-voice');
        els.send = document.getElementById('chatbot-send');
        els.status = document.getElementById('chatbot-status');

        if (!els.toggle || !els.panel) return;

        els.toggle.addEventListener('click', togglePanel);
        els.close.addEventListener('click', closePanel);
        els.form.addEventListener('submit', onSubmit);
        initVoiceInput();

        els.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                els.form.requestSubmit();
            }
        });

        if (!config.apiKey || config.apiKey === 'YOUR_FEATHERLESS_API_KEY') {
            els.status.textContent = 'CONFIG REQUIRED // chat-config.js';
            els.status.classList.add('busy');
        }

        appendMessage('assistant',
            'SYS_LINK ESTABLISHED. I am CAMPUS-AI.\n\n' +
            'Ask me to plan a route in plain English, e.g.:\n' +
            '"I am in b-417, fire at B-Block staircase, reach main gate safely"');
    }

    function togglePanel() {
        state.open = !state.open;
        els.panel.classList.toggle('open', state.open);
        els.toggle.classList.toggle('active', state.open);
        if (state.open) {
            setTimeout(() => els.input.focus(), 200);
        }
    }

    function closePanel() {
        state.open = false;
        els.panel.classList.remove('open');
        els.toggle.classList.remove('active');
    }

    function appendMessage(role, text) {
        const row = document.createElement('div');
        row.className = `chat-msg ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'chat-msg-avatar';
        avatar.innerHTML = role === 'user'
            ? '<i class="fa-solid fa-user"></i>'
            : '<i class="fa-solid fa-robot"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'chat-msg-bubble';
        bubble.textContent = text;

        row.appendChild(avatar);
        row.appendChild(bubble);
        els.messages.appendChild(row);
        els.messages.scrollTop = els.messages.scrollHeight;
        return bubble;
    }

    function setBusy(busy) {
        state.busy = busy;
        els.send.disabled = busy;
        els.input.disabled = busy;
        els.status.textContent = busy ? 'TRANSMITTING...' : 'ONLINE // FEATHERLESS AI';
        els.status.classList.toggle('busy', busy);
    }

    function initVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!els.voice) return;

        if (!SpeechRecognition) {
            els.voice.disabled = true;
            els.voice.title = 'Voice input is not supported in this browser';
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-IN';
        state.recognition = recognition;

        els.voice.addEventListener('click', toggleVoiceInput);

        recognition.onstart = () => {
            state.listening = true;
            els.voice.classList.add('listening');
            els.voice.title = 'Listening... click to stop';
            els.status.textContent = 'LISTENING... SPEAK NOW';
            els.status.classList.add('busy');
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                transcript += event.results[i][0].transcript;
            }
            els.input.value = `${state.voiceBaseText}${state.voiceBaseText && transcript ? ' ' : ''}${transcript}`.trim();
        };

        recognition.onerror = (event) => {
            const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
                ? 'MICROPHONE ACCESS DENIED'
                : `VOICE INPUT ERROR // ${event.error.toUpperCase()}`;
            els.status.textContent = message;
        };

        recognition.onend = () => {
            state.listening = false;
            els.voice.classList.remove('listening');
            els.voice.title = 'Speak your question';
            els.status.classList.remove('busy');
            if (!state.busy) {
                els.status.textContent = 'VOICE READY // REVIEW OR SEND';
            }
            els.input.focus();
        };
    }

    function toggleVoiceInput() {
        if (!state.recognition || state.busy) return;
        if (state.listening) {
            state.recognition.stop();
            return;
        }

        state.voiceBaseText = els.input.value.trim();
        try {
            state.recognition.start();
        } catch (error) {
            // Starting twice can throw while the browser is finishing a prior session.
        }
    }

    function tryCampusRoute(text) {
        const router = window._campusRouter;
        if (!router?.planRouteFromChat) return null;

        const result = router.planRouteFromChat(text);
        if (!result) return null;
        return result.message || result.error || null;
    }

    async function requestViaProxy(messages) {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || `Proxy request failed (${res.status})`);
        }
        return data.content;
    }

    async function requestViaFeatherless(messages) {
        if (!config.apiKey || config.apiKey === 'YOUR_FEATHERLESS_API_KEY') {
            throw new Error('Add your Featherless API key in chat-config.js');
        }

        const res = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model || 'Qwen/Qwen2.5-7B-Instruct',
                messages,
                temperature: 0.7,
                max_tokens: 1024,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            const err = data.error?.message || data.error || `Featherless request failed (${res.status})`;
            throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
        }

        return data.choices[0].message.content;
    }

    async function getAssistantReply(messages) {
        try {
            return await requestViaFeatherless(messages);
        } catch (directError) {
            try {
                return await requestViaProxy(messages);
            } catch (proxyError) {
                throw directError;
            }
        }
    }

    async function onSubmit(e) {
        e.preventDefault();
        const text = els.input.value.trim();
        if (!text || state.busy) return;

        els.input.value = '';
        appendMessage('user', text);
        state.messages.push({ role: 'user', content: text });

        setBusy(true);
        const typingBubble = appendMessage('assistant', '...');

        try {
            const routeReply = tryCampusRoute(text);
            if (routeReply) {
                typingBubble.textContent = routeReply;
                state.messages.push({ role: 'assistant', content: routeReply });
                return;
            }

            const content = await getAssistantReply(state.messages);
            typingBubble.textContent = content;
            state.messages.push({ role: 'assistant', content });
        } catch (err) {
            typingBubble.textContent = `Connection error: ${err.message}`;
            typingBubble.classList.add('error');
        } finally {
            setBusy(false);
            els.messages.scrollTop = els.messages.scrollHeight;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();
