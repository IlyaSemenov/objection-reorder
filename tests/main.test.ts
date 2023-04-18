import { Model } from "objection"
import reorder from "objection-reorder"
import { afterEach, beforeEach, expect, test } from "vitest"

import { setup } from "./setup"

class FooModel extends Model {
	static tableName = "foo"

	id?: number
	name?: string
	sort_order?: number
}

const knex = await setup()

beforeEach(async () => {
	await knex.schema.createTable("foo", (table) => {
		table.integer("id").notNullable().primary()
		table.string("name").notNullable()
		table.integer("sort_order").notNullable()
	})
})

afterEach(async () => {
	await knex.schema.dropTable("foo")
})

async function expect_order(names: string[]) {
	expect(
		await FooModel.query()
			.select("name")
			.orderBy("sort_order")
			.then((foos) => foos.map((foo) => foo.name))
	).toEqual(names)
}

test("access fields", async () => {
	await FooModel.query().insertGraph([
		{ id: 10, name: "Foo", sort_order: 0 },
		{ id: 3, name: "Bar", sort_order: 1 },
		{ id: 8, name: "Baz", sort_order: 2 },
		{ id: 7, name: "Qoox", sort_order: 3 },
	])

	// put Foo onto position 2, between Baz and Qoox
	await reorder(FooModel.query(), 10, 2)
	await expect_order(["Bar", "Baz", "Foo", "Qoox"])

	// put Foo onto position 0
	await reorder(FooModel.query(), 10, 0)
	await expect_order(["Foo", "Bar", "Baz", "Qoox"])

	// put Foo onto position 3
	await reorder(FooModel.query(), 10, 3)
	await expect_order(["Bar", "Baz", "Qoox", "Foo"])

	// put Baz onto position 3
	await reorder(FooModel.query(), 8, 3)
	await expect_order(["Bar", "Qoox", "Foo", "Baz"])
})
