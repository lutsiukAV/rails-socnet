class Group < ActiveRecord::Base
  has_many :microposts, dependent: :destroy
  has_many :users

  def feed
    Micropost.where("group_id = ?", id)
  end

end
