# objection-reorder

If you have a Postgres table with objects ordered with a dedicated field:

```
id | name | sort_order
---+------+-----------
10 | Foo  | 0
3  | Bar  | 1
7  | Baz  | 2
8  | Qoox | 3
```

and you have a UI where a user may drag and drop objects to reorder them, producing API calls like:

```
POST /objects/10/order?position=2
```

(meaning put Foo onto position 2, between Baz and Qoox)

and you have the backend server with Node.js and Objection.js,

then this library provides a utility method to update `sort_order` accordingly:

```
id | name | sort_order
---+------+-----------
3  | Bar  | 1
7  | Baz  | 2
10 | Foo  | 3 <--- object moved here, sort_order updated.
8  | Qoox | 4
```

*(The example is only provided for illustration. The actual resulting values of `sort_order` will be different for optimization purposes, but the order of objects will be guaranteed to be correct.)*

## Installation

```
yarn add objection-reorder
```

## Usage

Example:

```ts
import set_position from 'objection-reorder'
import MyModel from '~/my-objection-models/MyModel'

const { position } = ctx.request.query
await set_position(MyModel.query(), ctx.params.tip_id, position)
```

### Options

The 4th parameter is the optional settings object. If not provided, the following defaults are used:

```ts
await set_position(MyModel.query(), obj_id, position, {
  id_field: 'id',
  order_field: 'sort_order',
})
```

## Caveats

* The implementation is not completely thread safe, as it runs 2 SQL queries without a transaction.
