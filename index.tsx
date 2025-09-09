/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Chat } from '@google/genai';
import * as marked from 'marked';

// IMPORTANT: The API key is sourced from an environment variable.
// Do not hardcode the API key in the code.
const API_KEY = process.env.API_KEY;

// --- Constants and Interfaces ---
const CHAT_HISTORY_KEY = 'favorita-chat-history';

interface HistoryMessage {
  role: 'user' | 'model';
  text: string;
}

// --- DOM Elements ---
const chatContainer = document.getElementById('chat-container') as HTMLElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const sendButton = chatForm.querySelector('button') as HTMLButtonElement;

const catalogButton = document.getElementById('catalog-button') as HTMLButtonElement;
const catalogModal = document.getElementById('catalog-modal') as HTMLElement;
const closeCatalogButton = document.getElementById('close-catalog-button') as HTMLButtonElement;
const productSearch = document.getElementById('product-search') as HTMLInputElement;
const productGrid = document.getElementById('product-grid') as HTMLElement;

const productDetailModal = document.getElementById('product-detail-modal') as HTMLElement;
const closeDetailButton = document.getElementById('close-detail-button') as HTMLButtonElement;
const productDetailContent = document.getElementById('product-detail-content') as HTMLElement;

const clearChatButton = document.getElementById('clear-chat-button') as HTMLButtonElement;


// --- Product Data ---
interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  details: string[];
  image: string;
}

const products: Product[] = [
    {
        id: '93597',
        name: 'Dynamic Notebook',
        category: 'Escritório',
        description: 'O DYNAMIC é um caderno A5 idealizado e desenhado para ser um objeto funcional e prático com um toque de elegância citadina. Possui dois blocos de escrita diferentes, que podem ser utilizados e fechados separadamente. O material exterior é em polipele de elevada qualidade. Fornecido em caixa presente.',
        details: [
            'Tamanho: 150 x 210 mm',
            '128 folhas pautadas e não pautadas',
            'Material: Polipele e 1680D',
            'Fecho com ímã',
            'Impressão recomendada: HTS – 35 x 10 mm'
        ],
        image: 'https://placehold.co/300x300/007bff/white?text=Notebook'
    },
    {
        id: '57431',
        name: 'Relógio Thiker I',
        category: 'Tecnologia',
        description: 'Um sofisticado relógio inteligente resistente à água com bracelete em aço inox e transmissão por bluetooth 4.2. É um aliado para o dia-a-dia através de múltiplas funcionalidades: pedómetro, acesso a notificações, monitorização do sono, frequência cardíaca, etc.',
        details: [
            'Resistente à água',
            'Sensor de batimento cardíaco',
            'Monitorização do sono',
            'Bluetooth 4.2',
            'Autonomia até 72 horas em uso'
        ],
        image: 'https://placehold.co/300x300/343a40/white?text=Relógio'
    },
    {
        id: '30504',
        name: 'Camiseta Papaya',
        category: 'Vestuário',
        description: 'Camiseta unissex de corte regular em malha 100% algodão (165 g/m²) com fio 30/1 misto. Com gola em ribana, fita de reforço e com costura dupla nas mangas, barra de fundo e laterais.',
        details: [
            'Material: 100% algodão',
            'Tamanhos: P, M, G, GG',
            'Impressão recomendada: TXP – 280 x 200 mm'
        ],
        image: 'https://placehold.co/300x300/28a745/white?text=Camiseta'
    },
    {
        id: '92680',
        name: 'Mochila Empire',
        category: 'Mochilas',
        description: 'A mochila EMPIRE é sofisticada e construída em couro sintético texturado de elevada qualidade. O compartimento principal é composto por 2 divisórias almofadadas, compatíveis com notebook até 14’’ e tablet até 10.5’’. A parte posterior, com sistema de apoio acolchoado para as costas e as alças totalmente almofadadas, garante máximo conforto.',
        details: [
            'Compatível com notebook até 14” e tablet 10.5”',
            'Material: Couro sintético texturado',
            'Banda para transporte em trolley',
            'Base resistente e duradoura'
        ],
        image: 'https://placehold.co/300x300/6f42c1/white?text=Mochila'
    },
    {
      id: '92069',
      name: 'Pasta Serpa',
      category: 'Escritório',
      description: 'Pasta A4 em cortiça, com um bloco de 20 folhas não pautadas em cor marfim, suporte para esferográfica (não inclusa) e elástico. Fornecida em embalagem de non-woven.',
      details: [
        'Material: Cortiça',
        'Tamanho: A4 (239 x 307 x 17 mm)',
        'Inclui bloco de 20 folhas'
      ],
      image: 'https://placehold.co/300x300/fd7e14/white?text=Pasta'
    },
    {
      id: '58517',
      name: 'Luminária Lezzo',
      category: 'Tecnologia',
      description: 'Luminária de mesa em ABS e fibra de palha de trigo com carregador wireless. A haste é flexível para ajustar a direção da luz e contém 20 LEDs que permitem uma iluminação até 3 níveis de intensidade. O carregador sem fios é de carregamento rápido, tendo uma potência até 10W.',
      details: [
        'Carregador wireless 10W',
        '20 LEDs com 3 níveis de intensidade',
        'Material: ABS e fibra de palha de trigo',
        'Botão touch'
      ],
      image: 'https://placehold.co/300x300/ffc107/white?text=Luminária'
    }
];


// --- Chat History ---
function loadChatHistory(): HistoryMessage[] {
  const storedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
  try {
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch {
    console.error('Failed to parse chat history.');
    return [];
  }
}

function saveChatHistory(history: HistoryMessage[]) {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
}


// --- Chat Logic ---
let chat: Chat;

async function initializeChat() {
  try {
    if (!API_KEY) {
      throw new Error('API_KEY environment variable not set.');
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction:
          "Você é um assistente de bate-papo da empresa 'Favorita Brindes', uma empresa que vende brindes personalizados. Seu objetivo é responder às perguntas dos usuários sobre a empresa e seus produtos. Você tem acesso a um catálogo de produtos que o usuário pode visualizar e pesquisar. Incentive os usuários a explorar o catálogo clicando no botão 'Ver Catálogo'. Você NÃO deve criar orçamentos ou preços. Se um usuário pedir um orçamento ou para falar com um especialista, você DEVE responder que não pode fornecer orçamentos e deve direcioná-lo para falar com um consultor humano através deste link do WhatsApp: https://api.whatsapp.com/send?phone=5511978305002&text=Ol%C3%A1%2C%20Favorita!%20Gostaria%20de%20falar%20com%20um%20consultor.",
      },
    });

    let history = loadChatHistory();
    if (history.length === 0) {
        const initialMessageText = 'Olá! Sou o assistente da Favorita Brindes. Como posso ajudar?';
        history.push({ role: 'model', text: initialMessageText });
        saveChatHistory(history);
    }
    
    // Render all messages from history
    for (const message of history) {
      await appendMessage(message.role, message.text);
    }

  } catch (error) {
    console.error('Failed to initialize chat:', error);
    appendMessage(
      'model',
      'Desculpe, não consigo me conectar ao assistente de bate-papo no momento. Por favor, tente novamente mais tarde.'
    );
    setLoading(true);
  }
}

async function appendMessage(
  role: 'user' | 'model',
  text: string
): Promise<HTMLElement> {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', role);
  messageElement.innerHTML = await marked.parse(text);
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageElement;
}

function createLoadingIndicator(): HTMLElement {
  const loadingElement = document.createElement('div');
  loadingElement.classList.add('message', 'model', 'loading');
  loadingElement.innerHTML = `
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
    `;
  chatContainer.appendChild(loadingElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return loadingElement;
}

async function handleStream(prompt: string) {
  setLoading(true);
  const loadingIndicator = createLoadingIndicator();
  let fullResponse = '';

  try {
    const result = await chat.sendMessageStream({ message: prompt });
    let responseElement: HTMLElement | null = null;
    for await (const chunk of result) {
      if (!responseElement) {
        loadingIndicator.remove();
        responseElement = await appendMessage('model', '');
      }
      fullResponse += chunk.text;
      responseElement.innerHTML = await marked.parse(fullResponse);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    if (fullResponse) {
        const history = loadChatHistory();
        history.push({ role: 'model', text: fullResponse });
        saveChatHistory(history);
    }
  } catch (error) {
    console.error(error);
    loadingIndicator.remove();
    appendMessage(
      'model',
      'Desculpe, ocorreu um erro ao processar sua solicitação.'
    );
  } finally {
    setLoading(false);
    chatInput.focus();
  }
}

function setLoading(isLoading: boolean) {
  chatInput.disabled = isLoading;
  sendButton.disabled = isLoading;
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = chatInput.value.trim();
  if (!prompt) return;
  chatInput.value = '';
  
  await appendMessage('user', prompt);
  const history = loadChatHistory();
  history.push({ role: 'user', text: prompt });
  saveChatHistory(history);

  await handleStream(prompt);
});

clearChatButton.addEventListener('click', () => {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    location.reload();
});


// --- Catalog Logic ---
function renderProducts(productsToRender: Product[]) {
  productGrid.innerHTML = '';
  if (productsToRender.length === 0) {
    productGrid.innerHTML = '<p>Nenhum produto encontrado.</p>';
    return;
  }
  productsToRender.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>${product.category}</p>
    `;
    card.addEventListener('click', () => showProductDetails(product.id));
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            showProductDetails(product.id);
        }
    });
    productGrid.appendChild(card);
  });
}

function showProductDetails(productId: string) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const whatsappLink = `https://api.whatsapp.com/send?phone=5511978305002&text=${encodeURIComponent(`Olá, Favorita! Gostaria de um orçamento para o produto ${product.name} (ID: ${product.id}).`)}`;

  productDetailContent.innerHTML = `
    <img src="${product.image}" alt="${product.name}" class="product-detail-image">
    <div class="product-detail-info">
        <h3>${product.name}</h3>
        <p><strong>Categoria:</strong> ${product.category}</p>
        <p>${product.description}</p>
        <p><strong>Detalhes:</strong></p>
        <ul>
            ${product.details.map(detail => `<li>${detail}</li>`).join('')}
        </ul>
        <a href="${whatsappLink}" class="whatsapp-button" target="_blank" rel="noopener noreferrer">Pedir Orçamento</a>
    </div>
  `;
  productDetailModal.classList.add('visible');
  productDetailModal.setAttribute('aria-hidden', 'false');
}

function filterProducts() {
  const searchTerm = productSearch.value.toLowerCase();
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
  );
  renderProducts(filteredProducts);
}

function openModal(modal: HTMLElement) {
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal: HTMLElement) {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
}

catalogButton.addEventListener('click', () => {
    openModal(catalogModal);
    renderProducts(products);
});

productSearch.addEventListener('input', filterProducts);

// Close modal listeners
[closeCatalogButton, closeDetailButton].forEach(button => {
    button.addEventListener('click', () => {
        closeModal(catalogModal);
        closeModal(productDetailModal);
    });
});

[catalogModal, productDetailModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
});


// --- Initialize ---
initializeChat();