# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20161203135423) do

  create_table "friends", force: :cascade do |t|
    t.integer "user_id",   limit: 4, null: false
    t.integer "friend_id", limit: 4, null: false
  end

  create_table "groups", force: :cascade do |t|
    t.string  "name",     limit: 45
    t.integer "owner_id", limit: 4
    t.boolean "status",              default: true
  end

  create_table "messages", force: :cascade do |t|
    t.string   "text",        limit: 255
    t.integer  "sender_id",   limit: 4
    t.integer  "receiver_id", limit: 4
    t.datetime "created_at",              null: false
    t.datetime "updated_at",              null: false
  end

  add_index "messages", ["receiver_id"], name: "fk_rails_67c67d2963", using: :btree
  add_index "messages", ["sender_id"], name: "fk_rails_b8f26a382d", using: :btree

  create_table "microposts", force: :cascade do |t|
    t.text     "content",    limit: 65535
    t.integer  "user_id",    limit: 4
    t.datetime "created_at",               null: false
    t.datetime "updated_at",               null: false
    t.integer  "group_id",   limit: 4
  end

  add_index "microposts", ["user_id"], name: "index_microposts_on_user_id", using: :btree

  create_table "users", force: :cascade do |t|
    t.string  "login",           limit: 45
    t.string  "password_digest", limit: 1255
    t.boolean "admin",                        default: false
  end

  add_foreign_key "messages", "users", column: "receiver_id"
  add_foreign_key "messages", "users", column: "sender_id"
  add_foreign_key "microposts", "users"
end
