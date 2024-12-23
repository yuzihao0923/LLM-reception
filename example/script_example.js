let conversationHistory = [];

async function sendQuestion() {
    const userInput = document.getElementById('user-input');
    const question = userInput.value.trim();

    if (!question) {
        alert("请输入问题");
        return;
    }

    // 显示用户的问题
    appendMessage('user', question);
    conversationHistory.push({ sender: 'user', message: question });
    userInput.value = ''; // 清空输入框

    try {
        // 创建对话上下文，发送给后端
        const conversationContext = conversationHistory.map(item => `${item.sender}: ${item.message}`).join("\n");

        // 发送问题和对话历史到后端
        const response = await fetch('llm_bszn.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `question=${encodeURIComponent(question)}&context=${encodeURIComponent(conversationContext)}`
        });

        if (!response.ok) {
            throw new Error(`请求失败，状态码：${response.status}`);
        }

        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let partialContent = ''; // 用于存储每次流式接收到的内容
        let processedContents = new Set(); // 用于存储已处理的内容
        let allTitles = []; // 用于存储所有title的内容
        var no = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 解码当前的 chunk
            partialContent += decoder.decode(value, { stream: true });

            // 使用正则表达式查找所有 "content" 和 "title" 字段
            const contentMatches = [...partialContent.matchAll(/"content"\s*:\s*"([^"]*)"/g)];
            const titleMatches = [...partialContent.matchAll(/"title"\s*:\s*"([^"]*)"/g)];

            // 遍历所有匹配的 content
            
            contentMatches.forEach((match, index) => {

                var content = match[1];

                
                // 如果内容已经被处理过，则跳过
                if (processedContents.has(content)) {
                    return;
                }

                if(no == 0){
                    content = '【本回复由AI生成】：'+ content;
                    no++;
                }

                // 合并 content 和相应的 title（确保标题和内容匹配）
                const associatedTitle = allTitles[index] ? allTitles[index].shortened : '';
                const combinedContent = `${associatedTitle ? associatedTitle + ': ' : ''}${content}`;

                // 更新模型的回复内容
                updateModelResponse(combinedContent, associatedTitle);
                console.log('筛选出的内容:', content);

                // 将新内容添加到已处理内容集合
                processedContents.add(content);
                conversationHistory.push({ sender: 'model', message: content });
            });

            // 遍历所有匹配的 title
            titleMatches.forEach(match => {
                const title = match[1];

                // 只保存前17个字符，并添加省略号
                const shortenedTitle = title.length > 17 ? title.slice(0, 17) + '...' : title;

                // 将标题添加到allTitles数组中
                allTitles.push({ original: title, shortened: shortenedTitle });
            });

            // 处理完当前的 chunk 后清空 `partialContent`
            partialContent = ''; // Reset for the next chunk
        }

        // 一旦所有的标题都获取完成，更新页面显示标题
        updateTitles(allTitles);

    } catch (error) {
        console.error('API 调用失败:', error);
        appendMessage('model', `请求失败，请稍后再试。错误信息: ${error.message}`);
    }
}

// // 用于更新页面上显示的标题
// function updateTitles(titleContent) {
//     const chatBox = document.getElementById('chat-box');

//     // 获取最新的模型回答容器
//     const lastModelMessageContainer = chatBox.querySelector('.chat-message.model-response:last-child');

//     if (!lastModelMessageContainer) {
//         console.error("找不到模型的消息容器！");
//         return;
//     }

//     // 创建知识依据部分，显示标题
//     const knowledgeBasis = lastModelMessageContainer.querySelector('.knowledge-basis');
    
//     if (knowledgeBasis) {
//         knowledgeBasis.innerHTML += `<br><strong>知识依据：</strong> ${titleContent}`;
//     } else {
//         const newKnowledgeBasis = document.createElement('div');
//         newKnowledgeBasis.className = 'knowledge-basis';
//         newKnowledgeBasis.innerHTML = `<br><strong>知识依据：</strong> ${titleContent}`;
//         lastModelMessageContainer.appendChild(newKnowledgeBasis);
//     }
// }


function updateModelResponse(content, titleContent) {
    // 获取当前正在显示的最后一个问题
    const lastUserMessage = conversationHistory.filter(item => item.sender === 'user').pop();

    if (!lastUserMessage) {
        return; // 如果没有用户的消息，则返回
    }

    // 找到该问题的回答容器，假设它是一个特定的div
    const existingModelMessageContainer = document.querySelector(`#model-response-${lastUserMessage.message}`);

    if (!existingModelMessageContainer) {
        // 如果没有找到该问题的回答容器，创建一个新的
        appendMessage('model', content, lastUserMessage.message, titleContent);
    } else {
        // 如果找到了对应的回答容器，追加新的回答
        existingModelMessageContainer.querySelector('.message-text').textContent += '\n' + content;
        // 如果提供了知识依据，追加到同一框中
        if (titleContent) {
            existingModelMessageContainer.querySelector('.knowledge-basis').innerHTML += `<br><strong>知识依据：</strong> ${titleContent}`;
        }
    }

    // 保证聊天框总是滚动到底部
    const chatBox = document.getElementById('chat-box');
    chatBox.scrollTop = chatBox.scrollHeight;
}



function appendMessage(sender, message, userQuestion = '', titleContent = '') {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.className = sender === 'user' ? 'chat-message user-message' : 'chat-message model-response';
    messageElement.id = `model-response-${userQuestion}`; // 为每个回答框添加唯一ID

    // 创建包含头像和消息内容的div
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // 头像路径
    const avatarUrl = sender === 'user' ? '../resource/user-avatar.png' : '../resource/model-avatar.jpg';

    // 创建头像
    const avatarImg = document.createElement('img');
    avatarImg.src = avatarUrl;
    avatarImg.alt = `${sender} avatar`;
    avatarImg.className = 'avatar';

    // 创建消息文本
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message;

    // 将头像和消息文本添加到消息内容中
    messageContent.appendChild(avatarImg);
    messageContent.appendChild(messageText);

    // 如果存在知识依据，创建并添加知识依据部分
    if (titleContent) {
        const knowledgeBasis = document.createElement('div');
        knowledgeBasis.className = 'knowledge-basis';
        knowledgeBasis.innerHTML = `<br><strong>知识依据：</strong> ${titleContent}`;
        messageContent.appendChild(knowledgeBasis); // 知识依据放在回答文本下方
    }

    // 将整个消息内容添加到消息元素中
    messageElement.appendChild(messageContent);
    chatBox.appendChild(messageElement);

    // 保证聊天框总是滚动到底部
    chatBox.scrollTop = chatBox.scrollHeight;
}



// 清空聊天框
document.getElementById('clear').addEventListener('click', function () {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ''; // 清空聊天框
    conversationHistory = []; // 清空历史对话
});
