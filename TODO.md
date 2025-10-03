- App.tsx 
    1. `if (window.electronAPI.onScriptError) {
        window.electronAPI.onScriptError((data: any) => {
          console.log("❌ Script error:", data.scriptId, "Profile:", data.profileId, data.error);
          // Remove profile from running scripts using profileId
          if (data.profileId) {
            setAppState((prev) => ({
              ...prev,
              profiles: {
                ...prev.profiles,
                runningScripts: prev.profiles.runningScripts.filter(id => id !== data.profileId),
              },
            }));
          }
        });`
        we are looking at proxy address, not at profile id, also fix this in other elements, same for `onScriptFinished`,`onScriptStopped`
    2. Cannot invoke an object which is possibly 'undefined'.ts(2722) at 
        ` window.electronAPI.removeAllListeners("server-ping-received");
        window.electronAPI.removeAllListeners("ping-counter-update");
        window.electronAPI.removeAllListeners("nft-received");
        window.electronAPI.removeAllListeners("script-received");`
    3. Do we need 
        ` /**
           * Handle NFT image click
           */
          const handleNFTImageClick = (nftData: NFTData) => {
          };`?
    4. ` const handleScriptExecute = useCallback ` here we have `  // The actual execution will be handled by the ScriptManager
        // This is just logging for now` and if or logic to trigger script contain in other place check which one is worked at electron app.
    5. At `handleProfileDelete` also need to use proxy address as pointer not id 
    6. We need to remove handleProfileToggleActivation 
    7. In ProfileManager `runningScripts` and `selectedProfile` must be combined, in case of running script use selectedProfile,
        so there can be as maximum to a `maxProfiles `
    8. Fix the problem with any `Unexpected any. Specify a different type.`
- ScriptManager.tsx
    1. ` const [currentNFTAddress, setCurrentNFTAddress] = useState<string | null>(null);`  we are not using NFT address, remove and check for connections
    2. `
        const mapping: ScriptNFTMapping = {
        scriptId: scriptData.id,
        nftAddress,
        associatedAt: Date.now()
      };`, here we need to change nftAddress to image(url address), change it everywhere you find it
    3. Fix the problem with any `Unexpected any. Specify a different type.`
    4. Move interface `ScriptNFTMapping` to types/index.ts, and check if nftAddress was changed to image(url address)
- AddProfileModal.tsx
    1. `// Check for duplicate name (excluding current profile if editing)` need to check not for id, but for proxy address
    2. `// Validate cookies` we can start without cookie atm
- ProfileCard.tsx 
    1.  onSelect, change onSelect to active, when we start script with any of available profile need to switch toggle to active,
        isSelected we need to combine with onSelect and active
- ProfileManager.tsx
    1. `export const ProfileManager: React.FC<ProfileManagerProps> = ` we need to check props, what we get and what we really
        use, for example in case we change in profile card logic with onSelect so we need to make some change with this one,
        `runningScripts = []` need to change to a activeProfiles, when we run script we need to add profile to this massive or mapping and count as active
    2. ` onProfileToggleActivation,` we dont need toggle activation i think if we only trigger inside of running script
- SearchQueryBuilder.tsx
    1.  Do we need `initialUrl,` ?
    2.  Move interface to types/index.ts
    3.  `// Handle example query load` we need to add query string
    4.  `const handleUseInScript` we need to save this url at Profile, check interface at types/index.ts and add supporting for
            this type, save this setting at user computer with profile setting, and when user connect all accounts will be downloaded with preset of settings
    5. `handleReset` same here, save state for this Profile
    6. `value={query[fieldName] as number || ""}` fix error.
- QueryPreview.tsx 
    1. `operatorPattern` check which one we are really use at UI 

 