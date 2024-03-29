import { Address, beginCell, toNano } from '@ton/core';
import { BJetton, BJettonConfig } from '../wrappers/BJetton';
import { compile, NetworkProvider } from '@ton/blueprint';
import { buildTokenMetadataCell } from '../wrappers/utils';

export async function run(provider: NetworkProvider) {
    const bJettonWallet = await compile('BJettonWallet');

    const init_params = {
        name: 'Aka',
        description: 'A K A',
        image: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.svg',
        symbol: 'AKA',
        decimal: '9',
        group_id: '123456',
        group_owner: '54321',
    };

    const content = await buildTokenMetadataCell(init_params);

    const admin = provider.sender().address || Address.parse('UQBJev-cGiUhjbDKAlJ56VoWy5JjCnYNmqVOMgYB1qkS0eiq');

    const init_data: BJettonConfig = {
        admin_address: admin,
        content: content,
        jetton_wallet_code: bJettonWallet,
    };

    const bJetton = provider.open(BJetton.createFromConfig(init_data, await compile('BJetton')));

    await bJetton.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(bJetton.address);

    // run methods on `bJetton`
}
