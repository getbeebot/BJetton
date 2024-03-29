import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { BJetton, BJettonConfig } from '../wrappers/BJetton';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { buildTokenMetadataCell } from '../wrappers/utils';

describe('BJetton', () => {
    let code: Cell;
    let wallet_code: Cell;

    beforeAll(async () => {
        code = await compile('BJetton');
        wallet_code = await compile('BJettonWallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let bJetton: SandboxContract<BJetton>;
    let init_data: BJettonConfig;
    let content: Cell;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        const init_params = {
            name: 'Aka',
            description: 'A K A',
            image: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.svg',
            symbol: 'AKA',
            decimal: '9',
            group_id: '123456',
            group_owner: '54321',
        };

        content = await buildTokenMetadataCell(init_params);

        deployer = await blockchain.treasury('deployer');

        init_data = {
            admin_address: deployer.address,
            content: content,
            jetton_wallet_code: wallet_code,
        };

        bJetton = blockchain.openContract(BJetton.createFromConfig(init_data, code));

        const deployResult = await bJetton.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: bJetton.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and bJetton are ready to use
    });
    it('should get data', async () => {
        // try to get the jetton token info
        const { supply, mintable, admin, content } = await bJetton.getJettonData();
        console.log(`supple: ${supply}, mintable: ${mintable}, admin: ${admin}\ncontent: ${content}`);
    });
    it('should get wrapped token data', async () => {
        const { name, description, image, symbol, decimal, group_id, group_owner } =
            await bJetton.getJettonWrappedData();
        console.log(name, description, image, symbol, decimal, group_id, group_owner);
    });
});
