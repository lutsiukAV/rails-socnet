class AddFkMessages < ActiveRecord::Migration
  def change
    add_foreign_key :messages, :users, column: :sender_id
    add_foreign_key :messages, :users, column: :receiver_id
  end
end
