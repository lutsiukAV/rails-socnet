class FriendsController < ApplicationController
  def show

  end

  def index
    @friends = nil
    Friend.find_each do |friend|
      if (friend.user_id == current_user.id)
        if (@friends.nil?)
          @friends = []
        end
        @friends << friend
      end
    end
  end
  def add
    @friend = Friend.new(user_id: current_user.id, friend_id: params[:id])
    if @friend.save
      flash[:success] = "User has been added to your friend list"
      redirect_to friends_path
    else
      flash[:danger] = "Oops!!! Something went wrong"
      redirect_to users_path
    end

  end

  def remove

    @friend = Friend.find_by(friend_id: params[:id])
    Friend.delete(@friend)
    flash[:success] = "User has been removed from your friend list"
    redirect_to friends_path
  end
end
