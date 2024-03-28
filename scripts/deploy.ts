import { Address, beginCell, toNano } from '@ton/core';
import { BJetton, BJettonConfig } from '../wrappers/BJetton';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // TODO
    const bJettonWallet = await compile('BJettonWallet');

    const data = beginCell().endCell();

    const admin = provider.sender().address || Address.parse('UQBJev-cGiUhjbDKAlJ56VoWy5JjCnYNmqVOMgYB1qkS0eiq');

    const init_data: BJettonConfig = {
        total_supply: 21_000_000n,
        admin_address: admin,
        content: data,
        jetton_wallet_code: bJettonWallet,
    };

    const bJetton = provider.open(BJetton.createFromConfig(init_data, await compile('BJetton')));

    await bJetton.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(bJetton.address);

    // run methods on `bJetton`
}
