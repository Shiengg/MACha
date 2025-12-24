'use client';

import type { Conversation } from '@/services/conversation.service';

interface ConversationInfoProps {
    conversation: Conversation | null;
    conversationId?: string | null;
}

export default function ConversationInfo({ conversation, conversationId }: ConversationInfoProps) {
    // Nếu có conversationId nhưng chưa có conversation object, có thể fetch sau
    const currentConversationId = conversation?._id || conversationId;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Thông tin cuộc trò chuyện</h3>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="text-center text-gray-500">
                    <p className="text-sm">Thông tin</p>
                </div>
            </div>
        </div>
    );
}

