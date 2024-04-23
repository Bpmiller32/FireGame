using Godot;

namespace FireGame;

public class Jump : BaseState
{
    private double variableJumpTimer;

    public override void Enter()
    {
        GD.Print("Entered Jump");
        variableJumpTimer = Player.VariableJumpTime;
    }

    public override PlayerStates UpdatePhysics(double delta)
    {
        variableJumpTimer -= delta;

        int direction = 0;
        if (Input.IsActionPressed("Left"))
        {
            direction = -1;
        }
        if (Input.IsActionPressed("Right"))
        {
            direction = 1;
        }

        if (Input.IsActionPressed("Jump") && variableJumpTimer > 0)
        {
            Player.Velocity = new(Player.Velocity.X, Player.Velocity.Y - Player.JumpForce);
            // Player.Velocity = new(direction * Player.MoveSpeed, Player.Velocity.Y + (Player.Gravity * (float)delta));
            Player.MoveAndSlide();

            return PlayerStates.Null;
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