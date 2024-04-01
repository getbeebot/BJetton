import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, beginCell, toNano } from '@ton/core';
import { BJetton, BJettonConfig } from '../wrappers/BJetton';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { buildTokenMetadata, parseTokenMetadata, JETTON_WALLET_CODE } from '../wrappers/utils';
import { BJettonWallet, BJettonWalletConfig } from '../wrappers/BJettonWallet';

describe('BJetton', () => {
    let code: Cell;
    let wallet_code: Cell;

    const getJWalletContract = (wallet_owner: Address, master_address: Address) => {
        const config: BJettonWalletConfig = {
            balance: 0n,
            owner_address: wallet_owner,
            jetton_master_address: master_address,
            jetton_wallet_code: JETTON_WALLET_CODE,
        };
        BJettonWallet.createFromConfig(config, JETTON_WALLET_CODE);
    };

    beforeAll(async () => {
        code = await compile('BJetton');
        wallet_code = await compile('BJettonWallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let bJetton: SandboxContract<BJetton>;
    let init_data: BJettonConfig;
    let content: Cell;

    const tg_info = {
        protocol: 'bjt',
        id: '-1001839662169',
        owner: '6303440178',
        extra: 'ipfs://Qme2dWGPsFsd98opkPCnSUm375RkntHbRkd5qQke8RwSc8',
    };

    const token_metadata = {
        name: 'Banknote Plane',
        description: 'Fly with banknote planes and journey to every corner of the planet.',
        image: 'ipfs://QmRBUx9UbfrMLAK75tXTvcFUqG2duLihVR4PWpVuBUSuPz',
        symbol: 'BNP',
        decimals: '9',
        extends: JSON.stringify(tg_info),
    };

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        content = await buildTokenMetadata(token_metadata);

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

    it('should get jetton data', async () => {
        const { supply, admin, content } = await bJetton.getJettonData();

        const metadata = await parseTokenMetadata(content);

        console.log('%j', metadata);

        expect(supply).toEqual(0n);
        expect(admin).toEqualAddress(deployer.address);
        expect(metadata).toEqual(token_metadata);
    });

    it('should mint jetton by admin', async () => {
        let total_supply = await bJetton.getTotalSupply();
        expect(total_supply).toEqual(0n);

        let amount = toNano('1024.21');
        const res = await bJetton.sendMint(
            deployer.getSender(),
            deployer.address,
            amount,
            toNano('0.05'),
            toNano('0.1'),
        );

        total_supply = await bJetton.getTotalSupply();
        expect(total_supply).toEqual(toNano('1024.21'));
    });

    it('should change admin', async () => {
        let onchain_admin = await bJetton.getAdminAddress();
        expect(onchain_admin.toString()).toEqual(deployer.address.toString());

        let new_admin = Address.parse('UQB-OV1MxLVtNfg1w1_4DrrWm5mEqlR3vW7RIelYIHYhxt5H');

        await bJetton.sendChangeAdmin(deployer.getSender(), new_admin);

        onchain_admin = await bJetton.getAdminAddress();
        expect(onchain_admin.toString()).toEqual(new_admin.toString());
    });
});
