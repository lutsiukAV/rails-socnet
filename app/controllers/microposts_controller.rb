class MicropostsController < ApplicationController
  before_action :logged_in_user, only: [:create, :destroy]
  before_action :correct_user, only: :destroy
  def create
    @micropost = Micropost.new(group_id:params[:micropost][:group_id], content:params[:micropost][:content], user_id:current_user.id)
    if @micropost.save
      flash[:success] = "Micropost created!"
      redirect_to request.referrer || root_url
    else
      @feed_items = []
      redirect_to request.referrer || root_url
    end
  end
  def destroy
    @micropost.destroy
    flash[:success] = "Micropost deleted"
    redirect_to request.referrer || root_url
  end

  def edit
    params.permit!
    @micropost = Micropost.find(params[:id].to_i)
    render :edit
  end

  def post
    params.permit!
    @micropost = Micropost.find(params[:sender].to_i)
    @micropost.content = params[:content]
    @micropost.save
    redirect_to root_url
  end

  private
  def micropost_params
    params.require(:micropost).permit(:content)
  end
  def correct_user

    if !current_user.admin?
      @micropost = current_user.microposts.find_by(id: params[:id])
    else
      @micropost = Micropost.find(params[:id])
    end
    redirect_to root_url if @micropost.nil?


  end
end