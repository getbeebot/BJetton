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

    const bJettonWallet = await compile('JettonWallet');

    const tg_info = {
        protocol: 'bjt',
        id: '-1001839662169',
        owner: '6303440178',
        extra: 'ipfs://Qme2dWGPsFsd98opkPCnSUm375RkntHbRkd5qQke8RwSc8',
    };

    const init_params = {
        name: 'Banknote Plane',
        description: 'Fly with banknote planes and journey to every corner of  the planet.',
        image: 'ipfs://QmRBUx9UbfrMLAK75tXTvcFUqG2duLihVR4PWpVuBUSuPz',
        symbol: 'BNP',
        decimals: '9',
        extends: JSON.stringify(tg_info),
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

    // await jetton.sendDeploy(sender, toNano('0.05'));
    let amount = toNano('20120527');
    const recipient = Address.parse('UQAFDCQA90pHJgiEb9wKSOIqM_XaReh7fG5u1vHDmVFuS42q');
    // const res = await jetton.sendMint(sender, recipient, amount, toNano('0.05'), toNano('0.1'));

    console.log(jetton.address);
    const seqno = await wallet_contract.getSeqno();
    let cur_seqno = seqno;
    while (cur_seqno === seqno) {
        console.log('waiting for deploy transaction to confirm...');
        await sleep(2000);
        cur_seqno = await wallet_contract.getSeqno();
    }
    console.log('deploy transaction confirmed.');
    console.log(`Contract is deployed at: https://tonscan.org/jetton/${jetton.address}`);
}
