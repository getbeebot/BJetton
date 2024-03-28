import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type BJettonConfig = {
    total_supply: bigint;
    admin_address: Address;
    content?: Cell;
    jetton_wallet_code: Cell;
};

export function BJettonConfigToCell(config: BJettonConfig): Cell {
    return beginCell().endCell();
}

export class BJetton implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new BJetton(address);
    }

    static createFromConfig(config: BJettonConfig, code: Cell, workchain = 0) {
        const data = BJettonConfigToCell(config);
        const init = { code, data };
        return new BJetton(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
