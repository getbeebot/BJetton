import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type BJettonConfig = {
    admin_address: Address;
    content: Cell;
    jetton_wallet_code: Cell;
};

export function BJettonConfigToCell(config: BJettonConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.admin_address)
        .storeRef(config.content)
        .storeRef(config.jetton_wallet_code)
        .endCell();
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

    async getJettonData(provider: ContractProvider) {
        const { stack } = await provider.get('get_jetton_data', []);
        const supply = stack.readBigNumber();
        const mintable = stack.readNumber();
        const admin = stack.readAddress();
        const content = stack.readCell();
        return { supply, mintable, admin, content };
    }

    async getJettonWrappedData(provider: ContractProvider) {
        const { stack } = await provider.get('get_wrapped_token_data', []);

        const name_cell = stack.readCell();
        const name = this.cell2str(name_cell);

        const desc_cell = stack.readCell();
        const description = this.cell2str(desc_cell);

        const image_cell = stack.readCell();
        const image = this.cell2str(image_cell);

        const symbol_cell = stack.readCell();
        const symbol = this.cell2str(symbol_cell);

        const decimal = stack.readNumber();
        const group_id = stack.readBigNumber();
        const group_owner = stack.readBigNumber();

        return { name, description, image, symbol, decimal, group_id, group_owner };
    }
    cell2str(c: Cell): string {
        return Buffer.from(c.toString().slice(2, -1), 'hex').toString();
    }
}
