# BJetton

## What's BJetton

BJetton is a community Jetton token customized by [Beecon](https://beecon.me) for Telegram groups. Each group can have
its own Jetton token minted by the group owner using the [Beecon bot](https://t.me/beecon_bot), which can be used to
incentivize active participation among members of the community, enabling advertisers to purchase these tokens for ad
placements within the community.

To achieve this goal, and make trivial change for Jetton. We decide to using [TEP64][tep64] to store the
information with Telegram group. From the very beginning, the BJetton is just storing the relevant info:

- protocol: identifier, uint8, 1 for BJetton, others for future resevation.
- group_id: Telegram group ID, int64. Caused group is identified with group id, the group id is to ensure
            no duplicate tokens for group. One BJetton for one group.
- group_owner: The user id of Telegram group owner. This field is for permission purpose. Considering that
               there should be access authorization for management, like token issuing, burning and
               transferring group to others, we decide to store the group owner to BJetton's metadata.

All the three field are appended in the content Cell in Jetton, which would not mess up with Jetton's original
metadata.

For the advanced future, we're planning to make a proposal (maybe `TEP64-a`) for [TEP64][tep64] to add a new
attribute named `extend` for storing customizing info, which is, for BJetton, to storing all the telegram
group info (`protocol`, `group_id`, `group_name`, `group_link`, `group_owner`) to `extend` attribute in json
format. And other's could design their own protocol, and make use of it without changing Jetton a lot.

Furthermore, it's kind disappointment that we can not using telegram to interact with ton directly. So,
we're figuring a way to combining telegram and TON network, which may imply an oracle on TON, to get interact
with telegram on TON network directly via smart contract. This would be our first step on making telegram and
TON work together.


Q: Why store this info on-chain not off-chain?

A: Since off-chain's data is very easy to corrupt and modified by some malicious attacker. On-chain data
   is more rubbost than off-chain. Meanwhile, there's certain limitations(see [Telegram Limits][tg-limits])
   for these data, it's reasonable for the trade-off with higher storage rent fee and more reliable infomation.

[tep64]: https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md
[tg-limits]: https://limits.tginfo.me/en