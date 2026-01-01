'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { campaignService, Campaign } from '@/services/campaign.service';
import CampaignCard from '@/components/campaign/CampaignCard';

interface CampaignSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (campaign: Campaign) => void;
}

export default function CampaignSelectModal({ isOpen, onClose, onSelect }: CampaignSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setCampaigns([]);
      setError(null);
      return;
    }

    const fetchAllCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await campaignService.getAllCampaigns();
        const activeCampaigns = data.filter(
          (campaign) => ['active', 'approved', 'voting'].includes(campaign.status)
        );
        setCampaigns(activeCampaigns);
      } catch (err: any) {
        console.error('Error fetching campaigns:', err);
        setError('Không thể tải danh sách chiến dịch');
      } finally {
        setLoading(false);
      }
    };

    fetchAllCampaigns();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      const fetchAllCampaigns = async () => {
        try {
          setLoading(true);
          const data = await campaignService.getAllCampaigns();
          const activeCampaigns = data.filter(
            (campaign) => ['active', 'approved', 'voting'].includes(campaign.status)
          );
          setCampaigns(activeCampaigns);
        } catch (err: any) {
          console.error('Error fetching campaigns:', err);
          setError('Không thể tải danh sách chiến dịch');
        } finally {
          setLoading(false);
        }
      };
      fetchAllCampaigns();
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        let results: Campaign[] = [];

        if (searchQuery.startsWith('#')) {
          const hashtagName = searchQuery.substring(1).trim().toLowerCase();
          if (hashtagName) {
            results = await campaignService.searchCampaignsByHashtag(hashtagName);
          }
        } else {
          results = await campaignService.searchCampaignsByTitle(searchQuery.trim());
        }

        const activeCampaigns = results.filter(
          (campaign) => ['active', 'approved', 'voting'].includes(campaign.status)
        );
        setCampaigns(activeCampaigns);
      } catch (err: any) {
        console.error('Error searching campaigns:', err);
        setError('Không thể tìm kiếm chiến dịch');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectCampaign = (campaign: Campaign) => {
    onSelect(campaign);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Chọn chiến dịch
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-all hover:scale-110"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm chiến dịch, quỹ... (hoặc #hashtag)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white dark:focus:bg-gray-800 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Đang tải...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔍</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  {searchQuery ? 'Không tìm thấy chiến dịch nào' : 'Chưa có chiến dịch nào'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign._id}
                  campaign={campaign}
                  onClick={handleSelectCampaign}
                  disableNavigation={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

