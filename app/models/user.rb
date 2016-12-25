class User < ActiveRecord::Base
  def feed
    Micropost.where("user_id = ?", id)
  end
  belongs_to :group
  has_many :microposts, dependent: :destroy
  has_many :friends, dependent: :destroy
  has_many :messages, dependent: :destroy
  validates :login, presence: true, length: {maximum: 50},
            uniqueness: {case_sensitive: false}
  has_secure_password

  validates :password, length: {minimum: 5}
end
