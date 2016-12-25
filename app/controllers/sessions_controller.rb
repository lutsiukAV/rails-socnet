class SessionsController < ApplicationController
  def new
  end
  def create
    user = User.find_by(login: params[:session][:login].downcase)
    if user && user.authenticate(params[:session][:password])
      log_in user
      redirect_to root_path
    else
# Create an error message.
      flash.now[:danger] = 'Invalid login/password combination'
      render 'new'
    end
  end
  def destroy
    log_out
    redirect_to root_path
  end
end
