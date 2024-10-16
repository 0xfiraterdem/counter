import React, { useEffect, useState } from 'react';
import './App.css';
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  SystemProgram,
} from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@project-serum/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  WalletModalProvider,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react';
import idl from './config/counter.json'; 

import { Buffer } from 'buffer';
window.Buffer = Buffer;

const programID = new PublicKey(idl.address);
const network = WalletAdapterNetwork.Devnet;
const opts = { preflightCommitment: 'processed' };
const connection = new Connection(
  clusterApiUrl(network),
  opts.preflightCommitment
);

function App() {
  const wallet = useWallet();
  const [provider, setProvider] = useState(null);
  const [program, setProgram] = useState(null);
  const [balance, setBalance] = useState(null);
  const [counterValue, setCounterValue] = useState(null);

  useEffect(() => {
    const setup = async () => {
      if (wallet.connected) {
        const provider = getProvider(wallet);
        setProvider(provider);

        const programInstance = new Program(idl, programID, provider);
        setProgram(programInstance);

        await fetchBalance(wallet);
        await getCounter(programInstance);
      }
    };
    setup();
  }, [wallet.connected]);

  const getProvider = (wallet) => {
    return new AnchorProvider(connection, wallet, opts);
  };

  const fetchBalance = async (wallet) => {
    const balance = await connection.getBalance(wallet.publicKey);
    setBalance(balance / LAMPORTS_PER_SOL);
  };

  const getCounter = async (programInstance) => {
    try {
      const [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('counter'), wallet.publicKey.toBuffer()],
        programID
      );

      // Fetch account information
      const accountInfo = await connection.getAccountInfo(counterPda);

      if (accountInfo === null) {
        setCounterValue(0);
      } else {
        const counterAccount = await programInstance.account.counter.fetch(
          counterPda
        );
        setCounterValue(counterAccount.count.toString());
      }
    } catch (err) {
      console.error('Error fetching counter value:', err);
      setCounterValue(0);
    }
  };

  const increaseCounter = async () => {
    if (!program) return;
    try {
      const [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('counter'), wallet.publicKey.toBuffer()],
        programID
      );

      console.log('counterPda:', counterPda.toBase58());
      console.log('wallet.publicKey:', wallet.publicKey.toBase58());
      console.log('SystemProgram.programId:', SystemProgram.programId.toBase58());
      await program.methods
        .increaseCounter(new BN(1))
        .accounts({
          counter: counterPda,
          authority: wallet.publicKey,
          system_program: SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });

        getCounter(program);
    } catch (err) {
      console.error('Error increasing counter:', err);
    }
  };

  const decreaseCounter = async () => {
    if (!program) return;
    try {
      const [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('counter'), wallet.publicKey.toBuffer()],
        programID
      );
      await program.methods
        .decreaseCounter(new BN(1))
        .accounts({
          counter: counterPda,
          authority: wallet.publicKey,
          system_program: SystemProgram.programId,
        })
        .rpc();
      getCounter(program);
    } catch (err) {
      console.error('Error decreasing counter:', err);
    }
  };

  const disconnectWallet = async () => {
    try {
      await wallet.disconnect();
      console.log('Disconnected.');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  return (
    <div className="App">
      <h1>Counter DApp</h1>
      {wallet.connected ? (
        <>
          <p>
            <strong>Wallet Address:</strong> {wallet.publicKey.toBase58()}
          </p>
          <p>
            <strong>SOL Balance:</strong>{' '}
            {balance !== null ? `${balance} SOL` : 'Loading...'}
          </p>
          <p>
            <strong>Counter Value:</strong>{' '}
            {counterValue !== null ? counterValue : 'Loading...'}
          </p>
          <button onClick={increaseCounter}>Increase Counter</button>
          <button onClick={decreaseCounter}>Decrease Counter</button>
          <button onClick={disconnectWallet}>Disconnect</button>
        </>
      ) : (
        <>
          <p>Please connect your wallet to continue.</p>
          <WalletMultiButton />
        </>
      )}
    </div>
  );
}

export default function WrappedApp() {
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={clusterApiUrl(network)}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
