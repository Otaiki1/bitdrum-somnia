'use client';

import React, { createContext, useContext, useState } from 'react';
import type Controller from '@cartridge/controller';
import { connectBitdrumWallet, type BitdrumWallet } from '../utils/bitdrum';

type CartridgeWalletContextValue = {
  wallet: BitdrumWallet | null;
  address: string | null;
  username: string | null;
  authenticated: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  openProfile: () => Promise<void>;
};

const CartridgeWalletContext = createContext<CartridgeWalletContextValue | null>(null);

export function CartridgeWalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<BitdrumWallet | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    if (connecting) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const nextWallet = await connectBitdrumWallet();
      const nextUsername = await nextWallet.username();
      setWallet(nextWallet);
      setUsername(nextUsername ?? null);
    } catch (caughtError: any) {
      setError(caughtError?.message || 'Failed to connect Cartridge wallet');
      throw caughtError;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!wallet) {
      return;
    }

    try {
      await wallet.disconnect();
    } finally {
      setWallet(null);
      setUsername(null);
    }
  };

  const openProfile = async () => {
    if (!wallet) {
      return;
    }

    const controller = wallet.getController() as Controller;
    await controller.openProfile();
  };

  return (
    <CartridgeWalletContext.Provider
      value={{
        wallet,
        address: wallet?.address ?? null,
        username,
        authenticated: Boolean(wallet),
        connecting,
        error,
        connect,
        disconnect,
        openProfile,
      }}
    >
      {children}
    </CartridgeWalletContext.Provider>
  );
}

export function useCartridgeWallet() {
  const context = useContext(CartridgeWalletContext);

  if (!context) {
    throw new Error('useCartridgeWallet must be used within CartridgeWalletProvider');
  }

  return context;
}
