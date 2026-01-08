'use client';

import { useState } from 'react';
import { Sparkles, FileText, ArrowRight } from 'lucide-react';

interface KYCMethodSelectorProps {
  onSelectMethod: (method: 'traditional' | 'vnpt') => void;
}

export default function KYCMethodSelector({ onSelectMethod }: KYCMethodSelectorProps) {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Xác thực danh tính (KYC)
        </h1>
        <p className="text-lg text-gray-600">
          Chọn phương thức xác thực phù hợp với bạn
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border-2 border-transparent hover:border-blue-500 transition-all cursor-pointer group"
             onClick={() => onSelectMethod('vnpt')}>
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-2xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
            VNPT eKYC
          </h2>
          
          <div className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
            Khuyến nghị
          </div>
          
          <p className="text-gray-600 mb-6">
            Xác thực tự động bằng công nghệ AI của VNPT. Nhanh chóng, chính xác và có thể được duyệt tự động.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-sm text-gray-700">Trích xuất thông tin tự động từ CCCD</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-sm text-gray-700">Xác thực khuôn mặt bằng AI</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-sm text-gray-700">Kiểm tra giấy tờ thật giả</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-sm text-gray-700">Có thể duyệt tự động (5-10 phút)</p>
            </div>
          </div>

          <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center group-hover:scale-105">
            Chọn phương thức này
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 border-2 border-gray-200 hover:border-gray-400 transition-all cursor-pointer group"
             onClick={() => onSelectMethod('traditional')}>
          <div className="flex justify-center mb-6">
            <div className="bg-gray-300 p-4 rounded-2xl">
              <FileText className="w-12 h-12 text-gray-700" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
            Phương thức truyền thống
          </h2>
          
          <div className="bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
            Thủ công
          </div>
          
          <p className="text-gray-600 mb-6">
            Nhập thông tin thủ công và tải lên giấy tờ. Cần admin duyệt thủ công, có thể mất nhiều thời gian hơn.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-sm text-gray-700">Nhập thông tin thủ công</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-sm text-gray-700">Upload ảnh giấy tờ</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-sm text-gray-700">Không có xác thực AI</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-sm text-gray-700">Cần duyệt thủ công (1-3 ngày)</p>
            </div>
          </div>

          <button className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-all flex items-center justify-center group-hover:scale-105">
            Chọn phương thức này
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Gợi ý:</h3>
        <p className="text-sm text-blue-800">
          Chúng tôi <strong>khuyến nghị sử dụng VNPT eKYC</strong> để có trải nghiệm tốt nhất. 
          Phương thức này sử dụng công nghệ AI hiện đại để xác thực danh tính nhanh chóng và chính xác, 
          giúp bạn tiết kiệm thời gian chờ đợi.
        </p>
      </div>
    </div>
  );
}

