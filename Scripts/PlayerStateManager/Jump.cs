using Godot;

namespace FireGame;

public class Jump : BaseState
{
    public override void Enter()
    {
        GD.Print("Entered Jump");
        Player.Velocity = new(Player.Velocity.X, -Player.JumpForce);
    }

    public override void Exit()
    {
        GD.Print("Exited Jump");
    }

    public override PlayerStates UpdatePhysics(double delta)
    {
        int direction = 0;
        if (Input.IsActionPressed("Left"))
        {
            direction = -1;
        }
        if (Input.IsActionPressed("Right"))
        {
            direction = 1;
        }

        Player.Velocity = new(direction * Player.MoveSpeed, Player.Velocity.Y + (Player.Gravity * (float)delta));
        Player.MoveAndSlide();

        if (Player.Velocity.Y < 0)
        {
            return PlayerStates.Fall;
        }

        if (Player.IsOnFloor())
        {
            if (direction != 0)
            {
                return PlayerStates.Walk;
            }
            else
            {
                return PlayerStates.Idle;
            }
        }

        return PlayerStates.Null;
    }
}