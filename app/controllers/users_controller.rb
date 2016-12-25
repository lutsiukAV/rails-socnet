class UsersController < ApplicationController
  before_action :logged_in_user, only: [:edit, :update]
  before_action :correct_user, only: [:edit, :update]
  def new
    @user = User.new
  end
  def show
    @user = User.find(params[:id])
    @microposts = @user.microposts.paginate(page: params[:page])
  end
  def create
    params.permit!
    @user = User.new(params[:user])
    if @user.save
      puts @user
      log_in @user
      flash[:success] = "Welcome to the Social network app"
      redirect_to root_path
    else
      render 'new'
    end
  end
  def destroy
    @user = User.find(params[:id])

    Micropost.destroy_all(user_id:@user.id)
    User.delete(@user)
    flash[:success] = "User has been deleted"
    redirect_to root_path
  end
  def index
    @users = User.all
  end
  def list_json
    render json: User.all
  end
  def edit
    @user = User.find(params[:id])
  end
  def update
    @user = User.find(params[:id])
    if @user.update_attributes(user_params)
      flash[:success] = "Profile updated"
      redirect_to @user
    else
      render 'edit'
    end
  end
# Confirms the correct user.
  def correct_user
    @user = User.find(params[:id])
    redirect_to(root_url) unless @user == current_user
  end
  def user_params
    params.require(:user).permit(:login, :password, :password_confirmation)
  end
end
