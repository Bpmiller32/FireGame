using Godot;

namespace FireGame;

public class Fall : BaseState
{
    public override void Enter()
    {
        GD.Print("Entered Fall");
    }

    public override void Exit()
    {
        GD.Print("Exited Fall");
    }

    public override PlayerStates UpdatePhysics(double delta)
    {
        int direction = 0;
        if (Input.IsActionPressed("Left") && !Input.IsActionPressed("Right"))
        {
            PlayerSprites.Scale = new(1, 1);
            direction = -1;
        }
        if (Input.IsActionPressed("Right") && !Input.IsActionPressed("Left"))
        {
            PlayerSprites.Scale = new(-1, 1);
            direction = 1;
        }

        Player.Velocity = new(direction * Player.MoveSpeed, Player.Velocity.Y + (Player.Gravity * (float)delta));
        Player.MoveAndSlide();

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
