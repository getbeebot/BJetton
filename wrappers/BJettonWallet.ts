import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type BJettonWalletConfig = {
    balance: bigint;
    owner_address: Address;
    jetton_master_address: Address;
    jetton_wallet_code: Cell;
};

export function BJettonWalletConfigToCell(config: BJettonWalletConfig): Cell {
    return beginCell()
        .storeCoins(config.balance)
        .storeAddress(config.owner_address)
        .storeAddress(config.jetton_master_address)
        .storeRef(config.jetton_wallet_code)
        .endCell();
}

export class BJettonWallet implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new BJettonWallet(address);
    }

    static createFromConfig(config: BJettonWalletConfig, code: Cell, workchain = 0) {
        const data = BJettonWalletConfigToCell(config);
        const init = { code, data };
        return new BJettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
