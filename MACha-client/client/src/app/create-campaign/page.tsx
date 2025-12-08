'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import ProtectedRoute from '@/components/guards/ProtectedRoute';

function CreateCampaignContent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    { number: 1, title: 'Thông tin cơ bản' },
    { number: 2, title: 'Nội dung chi tiết và mục tiêu' },
    { number: 3, title: 'Cam kết mục đích sử dụng' },
    { number: 4, title: 'Xem lại và gửi yêu cầu' },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: 'Hủy tạo chiến dịch?',
      text: 'Tất cả thông tin bạn đã nhập sẽ bị mất. Bạn có chắc chắn muốn hủy?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Có, hủy tạo',
      cancelButtonText: 'Không, tiếp tục',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      router.back();
    }
  };

  const handleStepClick = (stepNumber: number) => {
    setCurrentStep(stepNumber);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-[1200px] mx-auto pt-8 pb-12 px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Tạo chiến dịch gây quỹ
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Hoàn thành các bước để tạo chiến dịch của bạn
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between max-w-[800px] mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => handleStepClick(step.number)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                      currentStep === step.number
                        ? 'bg-blue-600 text-white scale-110 shadow-lg'
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {currentStep > step.number ? '✓' : step.number}
                  </button>
                  <span
                    className={`mt-2 text-xs text-center font-medium ${
                      currentStep === step.number
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-all ${
                      currentStep > step.number
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                    style={{ marginTop: '-24px' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-12">
          
          {/* Step Content */}
          <div className="min-h-[400px] flex items-center justify-center">
            {currentStep === 1 && (
              <div className="text-center">
                <h2 className="text-6xl font-bold text-gray-900 dark:text-white">
                  Bước 1
                </h2>
                <p className="text-2xl text-gray-600 dark:text-gray-400 mt-4">
                  Thông tin cơ bản
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="text-center">
                <h2 className="text-6xl font-bold text-gray-900 dark:text-white">
                  Bước 2
                </h2>
                <p className="text-2xl text-gray-600 dark:text-gray-400 mt-4">
                  Nội dung chi tiết và mục tiêu
                </p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="text-center">
                <h2 className="text-6xl font-bold text-gray-900 dark:text-white">
                  Bước 3
                </h2>
                <p className="text-2xl text-gray-600 dark:text-gray-400 mt-4">
                  Cam kết mục đích sử dụng
                </p>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center">
                <h2 className="text-6xl font-bold text-gray-900 dark:text-white">
                  Bước 4
                </h2>
                <p className="text-2xl text-gray-600 dark:text-gray-400 mt-4">
                  Xem lại và gửi yêu cầu
                </p>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            {currentStep === 1 ? (
              <button
                onClick={handleCancel}
                className="px-6 py-3 rounded-lg font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
              >
                ✕ Hủy
              </button>
            ) : (
              <button
                onClick={handlePrevious}
                className="px-6 py-3 rounded-lg font-semibold bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-all"
              >
                ← Quay lại
              </button>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Bước {currentStep} / {totalSteps}
            </div>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={() => alert('Gửi yêu cầu tạo chiến dịch')}
                className="px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-all"
              >
                Gửi yêu cầu
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 max-w-[800px] mx-auto">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateCampaignPage() {
  return (
    <ProtectedRoute>
      <CreateCampaignContent />
    </ProtectedRoute>
  );
}

