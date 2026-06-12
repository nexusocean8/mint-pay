import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FIRO_CLIENT } from './firo.constants';
import type { FiroClient } from './firo.constants';
import { WalletInfoResponseDto } from '../admin/dto/wallet-info.dto';
import { Chain } from '../invoices/schemas/invoice.schema';

@Injectable()
export class FiroService implements OnModuleInit {
  private readonly log = new Logger(FiroService.name);

  constructor(@Inject(FIRO_CLIENT) private readonly client: FiroClient) {}

  async onModuleInit(): Promise<void> {
    try {
      const height = await this.client.getBlockCount();
      this.log.debug(`Firo RPC connected — tip height: ${height}`);
    } catch (err) {
      this.log.error(`Firo RPC connection failed: ${(err as Error).message}`);
    }
  }

  get rpc(): FiroClient {
    return this.client;
  }

  async getNewAddress(): Promise<string> {
    return await this.client.getNewAddress();
  }

  async getBlockCount(): Promise<number> {
    return await this.client.getBlockCount();
  }

  async getBlockHash(height: number): Promise<string> {
    return await this.client.getBlockHash(height);
  }

  async getBlockWithChainlock(hash: string): Promise<{
    hash: string;
    height: number;
    confirmations: number;
    chainlock?: boolean;
    time: number;
    tx: string[];
  }> {
    return await this.client.call('getblock', hash, 1);
  }

  async dumpHdInfo(): Promise<{
    mnemonic: string;
    mnemonicpassphrase?: string;
    hdseed: string;
  }> {
    return await this.client.call('dumphdinfo');
  }

  async getWalletInfo(): Promise<WalletInfoResponseDto> {
    const [blockHeight, walletInfo] = await Promise.all([
      this.getBlockCount(),
      this.client.getWalletInfo(),
    ]);
    return {
      chain: Chain.Firo,
      blockHeight,
      balance: walletInfo.balance,
      hdMasterKeyId: walletInfo.hdmasterkeyid,
      keypoolSize: walletInfo.keypoolsize,
    };
  }
}
