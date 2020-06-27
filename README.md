# Smart contracts and tests for a collateralized, upgradable stablecoin

The system has 3 main smart contracts:
- Proxy: serves as a permanent entry point for users.
- Store: stores data such as balances and roles.
- Token: all business logic is here.

Beyond normal stablecoin functionalities, these contracts also feature:
- Upgradable system: allows for the replacement of the logic layer (the token implementation).
- Role-based access control: manage roles and limit who can mint and burn tokens.
- Buy and sell produts using the stablecoin: there are transfer functions with arbitrary data fields.

The project has two other (private) repositories containing the administrative dashboard and the blockchain monitor (Node.js).

As soon as the coin is released, this readme will be properly created.


