console.log(`


        ## HELP?

        If you have managed to find this help page, you probably have most of the
        skills and curiosity needed to troubleshoot your own issues. But just in case,
        here is an overview of what this software is and how to use it. This
        tool tracks, organizes, and analyses almost 700,000 token pairs (growing
        every day). Each one is based on the original UniswapV2 code base, regardless
        of what chain it is on or who deployed it. This tool helps uncover actionable
        patterns, surface rare opportunities, and identify emerging trends within
        this corner of decentralized finance.



        ## INSTALLATION & SET UP

        1) Clone the repo from https://github.com/nicholashc/uniswap-skim-v2. Note:
        some of the database files are quire large (~500mb in total). You can also
        regenerate them locally.

        2) Navigate into the project's root directory, which should be named
        something like this:

              $ cd ./uniswap-skim-v2

        3) Run yarn in the root project directory to install the dependencies.
        I recommend yarn >1.22.x and node >v16.x.x, though it may work just fine
        with earlier versions. You can also use npm if you really must.

              $ yarn

        4) Rename the .env-example file to .env and add your own RPC links for
        the EVM blockchains you would like to use. Your own local node will perform
        the best, for a monthly fee there are dedicated node-as-service providers,
        which will also perform better than public endpoints in most cases. I
        recommend using web-sockets rather than http for increased performance.

        5) The main dependencies are web3.js, axios, coingecko-api, dotenv, and some
        standard node.js modules. Feel free to replace web3 with ethers, or any with
        your preferred libraries of choice. The only catch is you have to refactor
        the code yourself. The devDependencies in the package.json are only for
        linting and formatting and can be considered optional.



        ## COMMAND LINE INTERFACE

        1) Run any of the scripts in package.json from the root project directory.

              $ yarn run totals

        2) Some scripts have optional flags that can be used to unlock more
        features (explained later).

        3) For example, the script "new-pools" is invoked with:

              $ yarn run new-pools eth

        4) If you really must, you can use npm to do something similar. You can
        also use npx with a bit more set up that I won't cover here.

              $ npm run new-pools eth
              $ node scripts/utils/count-new.js eth

        5) Just in case, the $ in the command examples is not part of the command
        you will type.



        ## SCRIPTS

        1) totals

              $ yarn run totals

        - Displays tables of the total pair, factory, and network counts from
          your local database
        - Unique tables for the factories are tracked on each network, as well
          as an overall summary
        - Formatting may vary depending on your terminal environment and screen
          size. (this is very much an "it looks good on my screen" kind of project)
        - No RPC is needed for this feature
        - The initial commit contains mostly up-to-date data from 7 EVM chains,
          ~160 UniswapV2 clone factories, and almost ~700,000 token pairs
        - This command takes a few seconds to run with a decent personal computer
          (note: future time estimates will be based on my modest consumer set up
          and connection speeds). Your results may vary

        2) new-pools

               $ yarn run new-pools $network
               $ yarn run new-pools ftm

        - Gets a raw count of the new pools deployed by each factory since you last
          updated your database
        - A valid RPC is required to get results for each network you search, but it
          will run in "all" mode if you are missing RPC connections for one or more
          networks
        - It outputs a list of factories with new pools only, grouped by network
        - Note: this method does not update your database with any new information or
          edit files. Use scan-factory for that
        - This command takes at most 1 minute depending on your RPC connections

        3) update-prices

               $ yarn run update-prices $network $delay
               $ yarn run update-prices eth 21600

        - Pings the free Coingecko API to update a local database with recent USD
          token values
        - It's a great service and does not require an api key. They said it best at
          coingecko.com/en/api:

               "Our Free API* has a rate limit of 50 calls/minute."
        	            *Attribution required

        - To limit pings to the API before the data is stale, I added a default 24h
          individual cool-down for each token
        - The /data/tokens/tracked-prices.js file is updated automatically if the
          token price has moved
        - You can also modify the cool-down (as low as 0 seconds) for more frequent
          updates
        - Note: prices for many (especially non-Ethereum) assets are often
          unavailable, stale, or wildly misquoted
        - Pinging this api without getting your IP address blacklisted or throtlled
          requires limiting calls to ~1/second
        - This method can take hours to update the full token list. However,
          prioritizing high volume/market-cap coins for more frequent updates can help

        4) scan-factory

              $ yarn run scan-factory $factory
              $ yarn run scan-factory sushi-fantom

        - Checks for new pairs deployed since you last updated a given factory
        - For each new pair, the script saves the token data, pair address, and other
          relevant info
        - It automatically updates the files in /data/pairs/*/*.js and
          /data/factories/pair-counts.js
        - As long as you have a quick RPC connection and a computer with decent memory,
          this process is fast
        - Note: many of the file reading/writing/syncing implementations rely on small
          timeouts and delays. Please back up your databases regularly and test that
          everything is working before trying to sync a large quantity of pairs at once
        - The general workflow to update factory pairs is:
        - Run "new-pools"
        - Get an overview of where the activity has been
        - Call "scan-factory" for the factories you want to update locally

        5) search-self-lp

              $ yarn run search-self-lp $factory $offset
              $ yarn run search-self-lp quick -5000

        - See if any LP tokens have been sent to the pair contract that minted them
        - While uncommon, this does happen. LP tokens can be "arbitraged" by any user
          if they end up sent to their own contract. The underlying collateral can then
          be withdrawn
        - This script does one thing only, which makes it fast
        - Safety note:
        - There are many non-standard ERC-20s, locked transfer functions,
          self-destructed contracts, and other issues that may prevent this pattern
          from working as expected
        - Some UniswapV2 clones also modified or obscured the original code to alter
          this, and other, behavior

        6) scan-pair

              $ yarn run scan-pair $factory $mode $offset $precision $minVal
              $ yarn run scan-pair shib skim -50 0.05 1000

        - This tool has the most features to explore on-chain AMM data
        - It displays current token information, balances, reserves, prices, and a host
          of other information
        - The optional flags described below allow for more complex searches
        - Several AMMs on "incentivized evm testnets" like BSC spawned well over 500k
          pairs from a single factory
        - Each filtered pair is displayed in your terminal as a pretty-printed js
          object
        - Depending on the network and number of filters, this script usually runs in a
          few seconds to few minutes (eg, <10k pairs)
        - Safety note:
        - Many tokens (and pairs) are non-standard, unverified, bricked, or otherwise
          just plain scams
        - Some tokens are no longer queryable or cannot be transferred once acquired
        - I have not removed or filtered any tokens from the database (though a small
          number are bricked or may have been missed during data collection)
        - Tokens in this repo or discovered using these tools should be not be trusted
          without considerable due diligence
        - Please be extremely cautious if you chose to interact with any live contract

        7) render-table

              $ yarn run render-table $factory $offset $minVal
              $ yarn run render-table spooky 0 99.99

        - This is a stripped down version of scan-pair, made more efficient
        - It displays core token info in an organized table, sorted by the value
          "mismatch" of each token in the pair
        - This tool strips out as many RPC calls as possible to improve performance
        - It's useful for comparing trends and quickly spotting opportunities
        - Non-Ethereum chains have fewer prices available, leaving some gaps in the
          data
        - Please adjust your monitor, resolution, or font size if the table grid
          overlaps. It should look crisp like a spreadsheet
        - This feature works in seconds on sets of <2500 or fewer pairs (this includes
          most dexes), though slows down with massive datasets

        8) help

              $ yarn run help

        - The help command opens this page...¯\\_(ツ)_/¯
        - If you haven't found the answer to your question here, please feel free to
          dig into the code and modify it for your own purposes. Whatever your level of
          technical skill, you can probably figure out something new by poking around



        ## FLAGS

        These flags add extra control over how you can explore the data. While not
        all are available for every script, many can be combined. Note: scripts with
        more than one flag need to have the correct argument in each position from left
        to right, for example:

              $ yarn run scan-pair sushi -10     | 0123_5 no
              $ yarn run scan-pair sushi all -10 | 012345 yes

        1) $network:  [ eth, bsc, matic, xdai, heco, ftm, arbi, all* | default: eth]

        - The option "all" is only available for some scripts
        - Short names for different EVM chains (eg, matic == polygon, arbi == arbitrum)
        - Note: you need a working RPC endpoint for each chain you invoke

        2) $delay:    [ positive number | default: 86400 ]

        - Time in seconds to delay pinging the Coingecko API since the last attempt
        - Can attempt update 1 token / second for a single network or for all tracked
          tokens in sequence
        - Not every token has a tracked or current price available from this or any API

        3) $factory:  [ name of the factory: uni, sushi, shib | default: none ]

        - Each different AMM factory is a clone of UniswapV2 (though some have
          substantial modifications)
        - Each has a unique string name specific to the network it is on (list at the
          end of this document)
        - Many have <5 pairs while a few have 10ks or 100ks of thousands

        4) $offset:   [ positive or negative number | default: 0]

        - Positive numbers define the start of your search range
          (eg, 500 searches 500-1250 rather than 0-1250)
        - Negative numbers work like tail
          (eg, -500 searches the 500 most recent pairs 750-1250)
        - Whole numbers only, as they refer to an index in an array

        5) $minVal    [ positive number | default: 0 ]

        - Only return pools with a greater value than this number (in USD)
        - Many pools do not have a tracked price and therefore default to a value of 0
        - Pools with only one known price are "doubled" to infer the other token price
          and total value

        6) $mode      [ all, lp, imb, skim, sync, emoji, mismatch, pos | default: all]

        Available in the "scan-pair" tool, these modes allow for powerful filtering:

        "all"
        - returns all of the pairs available

        "lp"
        - returns pools with one or more LP tokens (catches most common AMM tokens)

        "imb"
        - returns pools with many more of one token than the other regardless of
          currency or decimal length (eg, 10000.00 and 0.000000001)

        "skim"
        - returns pools with a token balance higher than the reserve state. this can
          be "skimmed" by arbitrageurs or good Samaritans alike

        "sync"
        - returns pools whose reserves need to be synced in order to do any
          transaction (real balance or balances lower than recorded reserve)

        "emoji"
        - returns a sample of the other noteworthy pool conditions in this category
          with an added visual aid for quick scanning

        "mismatch"
        - returns pools with a large discrepancy in tracked USD price

        "pos"
        - returns pools where one or both tokens are officially mapped and bridged
          between Ethereum and Polygon

        7) $precision [ positive number | default: 0 ]

        - Ignores pools with a token balance lower than this amount (good for screening
          out dust and low value pools)
        - Note: these numbers are in fixed point "ether" units. Decimals are allowed
        - Tokens with <18 decimals or high unit value may create some false positives
          in this mode



        ## FACTORIES

        # ETH

        uni, sushi, arpa, best, poly, cell, unic, mini, cyan, taco, rigel, city,
        fast, sake, dx, link, cro, sashimi, bitberry, equalizer, trams, sunflower,
        king, unisave, nimbus, excavo, zeus, chkn, lua, safe, capital, ichi, shib,
        tacoV2, swipe, eswap, sum, tube, bt, miniV2, wsb, orion, tom, fff, cellV2,
        plasma, you, titan, yearn, gem, wss, unifi, swaphub, cityV2, poke, pokeV2,
        bcdc, difx, pocket, kwik, taal, d50, erne, materia, yearnV2, chicken, kingV2,
        hi, simple, btV2, elite, omg, ok, coinvex, nimbusV2, yearnV3, dao, ssf, icc,
        gain, sdg, ball, cc, litchi, luaV2, archi, suni, swapdex, coachhub, ddexV2,
        coachhubV2

        # POLYGON

        quick, sushi-matic, cometh, wault-matic, firebird, dfyn, ape-matic, steak,
        poly-matic, gravis-matic, honey-matic, zero, smartdex, jet, swapnet, cryption,
        you-bsc

        # FANTOM

        sushi-fantom, spirit, spooky, hyper, waka, fin, paint, aura, shib-ftm, zoo

        # XDAI

        sushi-xdai, honey, swapr-xdai, leven, bao

        # BSC

        sushi-bsc, cake, cake-v1, bakery, ape, thug, jul, cafe, cheese, slime, pure,
        dank, borg, panda, coin, mock, demax, demax-v1, bscswap, vault, bi, warden,
        gravis-bsc, mdex-bsc, softdrink, pact, panther, sato, venom

        # HECO

        mdex, butter, dogeswap, lava, bxh, pipi, galaxy-heco, you-heco

        # ARBITRUM

        sushi-arbi

`);
