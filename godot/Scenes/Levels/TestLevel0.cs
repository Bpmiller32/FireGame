using Godot;
using System;
using System.Diagnostics;

namespace FireGame;

public partial class TestLevel0 : Node2D
{
    // Called when the node enters the scene tree for the first time.
    public override void _Ready()
    {
        Stopwatch sw = new();
        Stopwatch sw2 = new();

        Area2D GravityTestTop = GetNode<Area2D>("GravityTestTop");
        Area2D GravityTestBottom = GetNode<Area2D>("GravityTestBottom");

        Area2D MovementSpeedStart = GetNode<Area2D>("MovementSpeedStart");
        Area2D MovementSpeedFinish = GetNode<Area2D>("MovementSpeedFinish");

        GravityTestTop.BodyEntered += (_) =>
        {
            sw.Start();
            GD.Print("Entered falltest");
        };

        GravityTestBottom.BodyEntered += (_) =>
        {
            sw.Stop();
            GD.Print(string.Format("Stopping falltest: elapsed time - {0}", sw.Elapsed.TotalMilliseconds));
        };

        MovementSpeedStart.BodyEntered += (_) =>
        {
            sw2.Start();
            GD.Print("Entered speedtest");
        };

        MovementSpeedFinish.BodyEntered += (_) =>
        {
            sw2.Stop();
            GD.Print($"Stopping speedtest: elapsed time {sw2.Elapsed.TotalMilliseconds}");
            // System.Console.WriteLine($"Stopping speedtest: elapsed time {sw2.Elapsed.TotalMilliseconds}");
        };
    }

    // Called every frame. 'delta' is the elapsed time since the previous frame.
    public override void _Process(double delta)
    {

    }
}
