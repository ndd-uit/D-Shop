import {
    checkAvailability,
} from '../availability/availability.service.js';
import {
    getGarmentById,
    getGarments,
} from '../garment/garment.service.js';
import {
    getActiveRentalPolicy,
} from '../policy/policy.service.js';
import {
    getRentalOrderDetail,
    getRentalOrderHistory,
    getRentalOrders,
} from '../rental/rental.service.js';
import {
    GeminiProvider,
} from './providers/gemini.provider.js';
import {
    createLocalRagRetriever,
} from './rag/localRag.service.js';
import {
    createChatbotService,
} from './chatbot.service.js';
import {
    createToolExecutor,
} from './chatbot.tools.js';

let chatbotService;

const getChatbotService = () => {
    if (chatbotService) return chatbotService;

    const toolExecutor = createToolExecutor({
        searchGarments: getGarments,
        getGarmentDetails: getGarmentById,
        checkAvailability,
        listRentalOrders: getRentalOrders,
        getRentalOrderDetail: (args) =>
            getRentalOrderDetail(args, {
                resolveEvidence: async (order) => order,
            }),
        getRentalOrderHistory,
        getActiveRentalPolicy,
    });

    chatbotService = createChatbotService({
        provider: new GeminiProvider(),
        toolExecutor,
        retriever: createLocalRagRetriever(),
    });
    return chatbotService;
};

export { getChatbotService };
