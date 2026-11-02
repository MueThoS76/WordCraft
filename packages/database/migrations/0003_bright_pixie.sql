CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_item_categories" (
	"content_item_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "content_item_categories_content_item_id_category_id_pk" PRIMARY KEY("content_item_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "content_item_categories" ADD CONSTRAINT "content_item_categories_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_item_categories" ADD CONSTRAINT "content_item_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;