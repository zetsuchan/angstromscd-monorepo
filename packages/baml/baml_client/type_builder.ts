/*************************************************************************************************

Welcome to Baml! To use this generated code, please run one of the following:

$ npm install @boundaryml/baml
$ yarn add @boundaryml/baml
$ pnpm add @boundaryml/baml

*************************************************************************************************/

// This file was generated by BAML: do not edit it. Instead, edit the BAML
// files and re-generate this code.
//
/* eslint-disable */
// tslint:disable
// @ts-nocheck
// biome-ignore format: autogenerated code
import type { FieldType } from '@boundaryml/baml/native'
import {
	type ClassBuilder,
	type ClassViewer,
	type EnumBuilder,
	EnumViewer,
	TypeBuilder as _TypeBuilder,
} from "@boundaryml/baml/type_builder";
import { DO_NOT_USE_DIRECTLY_UNLESS_YOU_KNOW_WHAT_YOURE_DOING_RUNTIME } from "./globals";

export default class TypeBuilder {
	private tb: _TypeBuilder;

	Citation: ClassViewer<
		"Citation",
		| "title"
		| "authors"
		| "journal"
		| "year"
		| "pmid"
		| "doi"
		| "relevance_score"
	>;

	MedicalInsight: ClassViewer<
		"MedicalInsight",
		| "summary"
		| "key_findings"
		| "citations"
		| "recommendations"
		| "confidence_level"
	>;

	Resume: ClassViewer<"Resume", "name" | "email" | "experience" | "skills">;

	constructor() {
		this.tb = new _TypeBuilder({
			classes: new Set(["Citation", "MedicalInsight", "Resume"]),
			enums: new Set([]),
			runtime: DO_NOT_USE_DIRECTLY_UNLESS_YOU_KNOW_WHAT_YOURE_DOING_RUNTIME,
		});

		this.Citation = this.tb.classViewer("Citation", [
			"title",
			"authors",
			"journal",
			"year",
			"pmid",
			"doi",
			"relevance_score",
		]);

		this.MedicalInsight = this.tb.classViewer("MedicalInsight", [
			"summary",
			"key_findings",
			"citations",
			"recommendations",
			"confidence_level",
		]);

		this.Resume = this.tb.classViewer("Resume", [
			"name",
			"email",
			"experience",
			"skills",
		]);
	}

	__tb() {
		return this.tb._tb();
	}

	string(): FieldType {
		return this.tb.string();
	}

	literalString(value: string): FieldType {
		return this.tb.literalString(value);
	}

	literalInt(value: number): FieldType {
		return this.tb.literalInt(value);
	}

	literalBool(value: boolean): FieldType {
		return this.tb.literalBool(value);
	}

	int(): FieldType {
		return this.tb.int();
	}

	float(): FieldType {
		return this.tb.float();
	}

	bool(): FieldType {
		return this.tb.bool();
	}

	list(type: FieldType): FieldType {
		return this.tb.list(type);
	}

	null(): FieldType {
		return this.tb.null();
	}

	map(key: FieldType, value: FieldType): FieldType {
		return this.tb.map(key, value);
	}

	union(types: FieldType[]): FieldType {
		return this.tb.union(types);
	}

	addClass<Name extends string>(name: Name): ClassBuilder<Name> {
		return this.tb.addClass(name);
	}

	addEnum<Name extends string>(name: Name): EnumBuilder<Name> {
		return this.tb.addEnum(name);
	}

	addBaml(baml: string): void {
		this.tb.addBaml(baml);
	}
}
