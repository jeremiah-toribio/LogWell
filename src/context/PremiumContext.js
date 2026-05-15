import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  isPremium,
  getPremiumStatus,
  canAddRecord,
  hasFeature,
  PREMIUM_FEATURES,
  FREE_LIMITS,
} from '../services/premium';
import { addAdBonusEntries } from '../services/ads';

const PremiumContext = createContext();

export function PremiumProvider({ children }) {
  const [premiumStatus, setPremiumStatus] = useState({
    isPremium: false,
    subscription: null,
    weeklyRecords: {
      total: 0,
      limit: FREE_LIMITS.RECORDS_PER_WEEK,
      remaining: FREE_LIMITS.RECORDS_PER_WEEK,
    },
    adBonusEntries: 0,
    canAddRecord: true,
    loading: true,
  });

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallContext, setPaywallContext] = useState(null);

  const [adPromptVisible, setAdPromptVisible] = useState(false);

  const refreshPremiumStatus = useCallback(async () => {
    try {
      const status = await getPremiumStatus();
      setPremiumStatus({
        ...status,
        loading: false,
      });
    } catch (error) {
      console.error('Error refreshing premium status:', error);
      setPremiumStatus(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const showPaywall = useCallback((context = null) => {
    setPaywallContext(context);
    setPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
    setPaywallContext(null);
  }, []);

  const showAdPrompt = useCallback(() => {
    setAdPromptVisible(true);
  }, []);

  const hideAdPrompt = useCallback(() => {
    setAdPromptVisible(false);
  }, []);

  const handleAdReward = useCallback(async (entries) => {
    await addAdBonusEntries(entries);
    await refreshPremiumStatus();
    hideAdPrompt();
  }, [refreshPremiumStatus, hideAdPrompt]);

  const checkCanAddRecord = useCallback(async () => {
    const result = await canAddRecord();
    if (!result.allowed) {
      showAdPrompt();
      return false;
    }
    return true;
  }, [showAdPrompt]);

  const checkFeatureAccess = useCallback(async (featureId, contextType) => {
    const hasAccess = await hasFeature(featureId);
    if (!hasAccess) {
      showPaywall(contextType);
      return false;
    }
    return true;
  }, [showPaywall]);

  const value = {
    ...premiumStatus,
    refreshPremiumStatus,
    showPaywall,
    hidePaywall,
    paywallVisible,
    paywallContext,
    checkCanAddRecord,
    checkFeatureAccess,
    PREMIUM_FEATURES,
    adPromptVisible,
    showAdPrompt,
    hideAdPrompt,
    handleAdReward,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}
