# BJetton

## What's BJetton

BJetton is a community Jetton token customized by [Beecon](https://beecon.me) for Telegram groups. Each group can have
its own Jetton token minted by the group owner using the [Beecon bot](https://t.me/beecon_bot), which can be used to
incentivize active participation among members of the community, enabling advertisers to purchase these tokens for ad
placements within the community.

To achieve this goal and effect trivial changes for Jetton. We have decided to using [TEP64][tep64] to store the
information within the Telegram group. From the very beginning, BJetton is just storing the relevant info:

- protocol: identifier, uint8, 1 for BJetton, others for future resevation.
- group_id: Telegram group ID, int64. Since groups are identified by their unique group ID, the group id is to ensure
            no duplicate tokens for group. One BJetton for one group.
- group_owner: The user id of Telegram group owner. This field serves permission purpose. Considering that
               there should be access authorization for management, like token issuing, burning and
               transferring group to others, we decide to store the group owner to BJetton's metadata.

All the three field are appended in the content Cell in Jetton, which would not mess up Jetton's original
metadata.

For the foreseeable future, we are planning to make a proposal (possibly `TEP64-a`) for [TEP64][tep64] to add a new
attribute named `extend` for storing customized info. This would involve, for BJetton, storing all the telegram
group info (`protocol`, `group_id`, `group_name`, `group_link`, `group_owner`) in the `extend` attribute in JSON
format. Others could design their own protocols and make use of them without significant alternations to Jetton.

Furthermore, it's kind disappointment that we can not use telegram to interact with TON directly. Therefore,
we're exploring ways to combine Telegram and TON network, which may involve an oracle on TON to enable interaction
with Telegram on TON network directly via smart contract. This would be our first step in making Telegram and
TON work together.


Q: Why store this info on-chain not off-chain?

A: Since off-chain's data is very easy to corrupt and modified by some malicious attackers. On-chain data
   is more rubost than off-chain data. Meanwhile, there's certain limitations(see [Telegram Limits][tg-limits])
   for this data, so it's reasonable for the trade-off with a higher storage rent fee for more reliable infomation.

[tep64]: https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md
[tg-limits]: https://limits.tginfo.me/en
