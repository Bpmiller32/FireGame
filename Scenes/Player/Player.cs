using Godot;

namespace FireGame;

public partial class Player : CharacterBody2D
{
    [Export]
    public int MoveSpeed { get; set; } = 500;
    [Export]
    public int Gravity { get; set; } = 1575;
    [Export]
    public int JumpForce { get; set; } = 955;
    [Export]
    public double VariableJumpTime { get; set; } = 0.9;
    [Export]
    public double JumpBufferTime { get; set; } = 0.1;
    [Export]
    public double CoyoteTime { get; set; } = 0.1;

    private PlayerStateManager stateMachine;

    public override void _Ready()
    {
        stateMachine = new(this);
    }

    public override void _UnhandledKeyInput(InputEvent inputEvent)
    {
        stateMachine.Input(inputEvent);
    }

    public override void _PhysicsProcess(double delta)
    {
        stateMachine.UpdatePhysics(delta);
    }
}
