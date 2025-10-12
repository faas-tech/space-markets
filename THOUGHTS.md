**AssetERC20.sol**

- Why is an asset an ERC-20 instead of a ERC1155? enabling metadata for off-chain purposes (invintory) and supports an image.
- If we are to continue with an ERC-20, we should use the ERC-20Permit.
- it's unlikely that anybody would ever launch an application at the genesis block, unnecessary gas consumption.
- AssetERC20 as upgradable?

```
    if (currentClock <= 1) {
        _snapshotClocks[snapshotId] = currentClock;
    } else {
        _snapshotClocks[snapshotId] = currentClock - 1;
    }
```

- This is an unrealistic condition. This implies that someone's checking a balance/supply within the same block that a snapshot is being taken.

```
     if (clockValue == clock()) {
        return getVotes(account);
    }
```

**AssetRegistry**

- AssetRegistry is not AssetRegistry by configuring this it inherently gives access to all of the structs and ensures that it adheres to the shape of the interface or remove the interface.
- It's better not to set initial value types in counters but rther increment accordingly
- AssetRegistry as upgradable?

```
    uint256 public nextTypeId = 1;
        uint256 public nextAssetId = 1;
```

- Events can be moved to the interface.
- createAssetType Allows for the creation of identical assets Differentiated by the `typeId`. Identical assets are the same type of asset. So I'm not sure if `typeId` is the right nomenclature. Assets that are the same type, i.e., identical schemahash Be added to the system once, Where all assets of the same schema hash share the same schema URI. Where the schema URI can be included in the metadata of the registered asset if it's an ERC1155?
- Should we use IPFS for metadata or maintain metadata on-chain?
- It is best not to use the ADMIN_ROLE As an access control role on functions.
- We should use a CloneFactory to create a new asset ERC20/1155.
- `registerAsset` argument dataURI is not required if 1155.
- Asset metadata can be documented in the 1155 metadata

- **LeaseFactory**

- We should stay away from using the `ADMIN_ROLE" to gate function permissioins
- if metadata is maintained onchain we can fetch metadataHash, assetTypeSchemaHash
- I think we can remove `nonce` and maybe `lessee` from lease intent, depandant on how we hadle the overlap between`LeaseIntent` and `LeaseData` properties.
- - unique to `LeaseIntent` nonce, deadline, assetTypeSchemaHash
- - unique to `LeaseData` tokenURIOverride, exists (both of which can be removed, a lessee of !address(0) = exists)
- Why compute a tokenId and not use a counter.
- `mintLease` protect owner only owner of asset
- `LeaseFactory` as upgradable?
