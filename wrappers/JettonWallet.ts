import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';

import { Op as OP } from './JettonConstants';

export type JettonWalletConfig = {
    balance: bigint;
    owner_address: Address;
    jetton_master_address: Address;
    jetton_wallet_code: Cell;
};

export function JettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell()
        .storeCoins(config.balance)
        .storeAddress(config.owner_address)
        .storeAddress(config.jetton_master_address)
        .storeRef(config.jetton_wallet_code)
        .endCell();
}

export class JettonWallet implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
        const data = JettonWalletConfigToCell(config);
        const init = { code, data };
        return new JettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    static transferMessage(to: Address, jetton_amount: bigint, query_id: number | bigint = 0) {
        return beginCell()
            .storeUint(OP.transfer, 32)
            .storeUint(query_id, 64)
            .storeCoins(jetton_amount)
            .storeAddress(to)
            .endCell();
    }
    async sendTransfer(provider: ContractProvider, via: Sender, to: Address, jetton_amount: bigint) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonWallet.transferMessage(to, jetton_amount),
            value: toNano('0.01'),
        });
    }

    async getWalletData(provider: ContractProvider) {
        const { stack } = await provider.get('get_wallet_data', []);
        const balance = stack.readBigNumber();
        const owner = stack.readAddress();
        const jetton_master = stack.readAddress();
        const wallet_code = stack.readCell();

        return { balance, owner, jetton_master, wallet_code };
    }
    async getBalance(provider: ContractProvider) {
        const { balance } = await this.getWalletData(provider);
        return balance;
    }
    async getJettonMasterAddress(provider: ContractProvider) {
        const { jetton_master } = await this.getWalletData(provider);
        return jetton_master;
    }
    async getWalletCode(provider: ContractProvider) {
        const { wallet_code } = await this.getWalletData(provider);
        return wallet_code;
    }
}
