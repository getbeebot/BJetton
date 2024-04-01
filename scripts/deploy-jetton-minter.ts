import * as fs from 'fs';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { TonClient, Cell, WalletContractV4, Address, toNano } from '@ton/ton';
import { keypair, sleep, buildTokenMetadata } from '../wrappers/utils';
import { compile } from '@ton/blueprint';
import { BJetton } from '../wrappers/BJetton';

export async function run() {
    // initialize ton rpc client on testnet
    const endpoint = await getHttpEndpoint({ network: 'mainnet' });
    const client = new TonClient({ endpoint });

    const key = await keypair();
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: key.publicKey,
    });
    if (!(await client.isContractDeployed(wallet.address))) {
        return console.log('wallet is not deployed');
    }

    const wallet_contract = client.open(wallet);
    const sender = wallet_contract.sender(key.secretKey);

    const bJettonWallet = await compile('BJettonWallet');

    const init_params = {
        name: 'Trinitas',
        description: ' God the Father, God the Son and God the Holy Spirit',
        image: 'https://en.wikipedia.org/wiki/Christian_cross#/media/File:Christian_cross.svg',
        symbol: 'TTT',
        decimal: '18',
        protocol: '1',
        group_id: '101',
        group_owner: '0',
    };

    const content = await buildTokenMetadata(init_params);

    const admin = wallet.address;

    const init_data = {
        admin_address: admin,
        content: content,
        jetton_wallet_code: bJettonWallet,
    };

    const jetton_code = await compile('BJetton');
    const jetton_contract = BJetton.createFromConfig(init_data, jetton_code);
    const jetton = client.open(jetton_contract);

    await jetton.sendDeploy(sender, toNano('0.05'));

    const seqno = await wallet_contract.getSeqno();
    let cur_seqno = seqno;
    while (cur_seqno === seqno) {
        console.log('waiting for deploy transaction to confirm...');
        await sleep(2000);
        cur_seqno = await wallet_contract.getSeqno();
    }
    console.log('deploy transaction confirmed.');
    console.log(`Contract is deployed at: https://tonscan.org/jetton/${jetton.address}`);

    await jetton.sendMint(
        sender,
        Address.parse('UQBJev-cGiUhjbDKAlJ56VoWy5JjCnYNmqVOMgYB1qkS0eiq'),
        21000000n,
        toNano('0.05'),
        toNano('0.1'),
    );
}
